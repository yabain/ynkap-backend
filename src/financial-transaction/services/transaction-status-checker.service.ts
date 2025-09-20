import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { FinancialTransactionService } from './financial-transaction.service';
import { PaymentService } from './payment.service';
import { FinancialTransactionState } from '../enum';
import { FinancialTransactionDocument } from '../models';
import { TransactionLogService } from 'src/logs/services/transaction-log.service';

@Injectable()
export class TransactionStatusCheckerService {
    private readonly logger = new Logger(TransactionStatusCheckerService.name);

    constructor(
        private readonly financialTransactionService: FinancialTransactionService,
        private readonly paymentService: PaymentService,
        private readonly transactionLogService: TransactionLogService
    ) {}

    /**
     * Cron Job qui s'exécute toutes les 2 minutes pour vérifier les transactions PENDING
     */
    @Cron('*/2 * * * *', {
        name: 'check-pending-transactions',
        timeZone: 'Africa/Douala'
    })
    async checkPendingTransactions() {
        this.logger.log('🔍 Début de la vérification des transactions PENDING...');
        
        try {
            // Récupérer toutes les transactions en état PENDING
            const pendingTransactions = await this.financialTransactionService.findByField({
                state: FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING
            });

            if (!pendingTransactions || pendingTransactions.length === 0) {
                this.logger.log('✅ Aucune transaction PENDING trouvée');
                return;
            }

            this.logger.log(`📋 ${pendingTransactions.length} transaction(s) PENDING trouvée(s)`);

            // Traiter chaque transaction PENDING
            for (const transaction of pendingTransactions) {
                await this.processTransaction(transaction);
            }

            this.logger.log('✅ Vérification des transactions PENDING terminée');
        } catch (error) {
            this.logger.error('❌ Erreur lors de la vérification des transactions PENDING:', error);
            
            // Logger l'erreur dans le système de logs
            await this.transactionLogService.logTransaction(
                'CRON_JOB',
                'SYSTEM',
                FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                'CRON_CHECK',
                0,
                'SYSTEM',
                'system',
                'CRON_JOB',
                { error: error.message, stack: error.stack }
            );
        }
    }

    /**
     * Traite une transaction individuelle
     */
    private async processTransaction(transaction: FinancialTransactionDocument) {
        const transactionId = transaction._id.toString();
        const applicationId = transaction.application?.toString();
        const userId = transaction.userRef?.fullName || 'Unknown';

        this.logger.log(`🔄 Vérification de la transaction ${transaction.ref} (${transactionId})`);

        try {
            // Logger le début de la vérification
            await this.transactionLogService.logTransaction(
                transactionId,
                applicationId,
                FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING,
                transaction.type,
                transaction.amount,
                transaction.paymentMode,
                userId,
                'CRON_JOB',
                { action: 'CRON_CHECK_START', ref: transaction.ref }
            );

            // Vérifier le statut de la transaction via le service de paiement
            const updatedTransaction = await this.paymentService.checkPayment(transaction.token);

            if (updatedTransaction.state === FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS) {
                this.logger.log(`✅ Transaction ${transaction.ref} confirmée comme SUCCESS`);
                
                // Logger le succès
                await this.transactionLogService.logTransactionStateChange(
                    transactionId,
                    applicationId,
                    FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING,
                    FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS,
                    userId
                );

            } else if (updatedTransaction.state === FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR) {
                this.logger.log(`❌ Transaction ${transaction.ref} marquée comme FAILED`);
                
                // Logger l'échec
                await this.transactionLogService.logTransactionStateChange(
                    transactionId,
                    applicationId,
                    FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING,
                    FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                    userId
                );

            } else {
                this.logger.log(`⏳ Transaction ${transaction.ref} toujours PENDING`);
                
                // Logger que la transaction est toujours en attente
                await this.transactionLogService.logTransaction(
                    transactionId,
                    applicationId,
                    FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING,
                    transaction.type,
                    transaction.amount,
                    transaction.paymentMode,
                    userId,
                    'CRON_JOB',
                    { action: 'STILL_PENDING', ref: transaction.ref }
                );
            }

        } catch (error) {
            this.logger.error(`❌ Erreur lors de la vérification de la transaction ${transaction.ref}:`, error);
            
            // Logger l'erreur spécifique à cette transaction
            await this.transactionLogService.logTransaction(
                transactionId,
                applicationId,
                FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                transaction.type,
                transaction.amount,
                transaction.paymentMode,
                userId,
                'CRON_JOB',
                { 
                    action: 'CRON_CHECK_ERROR', 
                    ref: transaction.ref,
                    error: error.message,
                    stack: error.stack 
                }
            );
        }
    }

    /**
     * Méthode pour déclencher manuellement la vérification (utile pour les tests)
     */
    async triggerManualCheck() {
        this.logger.log('🔧 Déclenchement manuel de la vérification des transactions PENDING');
        await this.checkPendingTransactions();
    }

    /**
     * Méthode pour obtenir des statistiques sur les transactions PENDING
     */
    async getPendingTransactionsStats() {
        try {
            const pendingTransactions = await this.financialTransactionService.findByField({
                state: FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING
            });

            const stats = {
                totalPending: pendingTransactions.length,
                byPaymentMode: {},
                oldestTransaction: null,
                newestTransaction: null
            };

            if (pendingTransactions.length > 0) {
                // Grouper par mode de paiement
                pendingTransactions.forEach(transaction => {
                    const paymentMode = transaction.paymentMode;
                    stats.byPaymentMode[paymentMode] = (stats.byPaymentMode[paymentMode] || 0) + 1;
                });

                // Trouver la plus ancienne et la plus récente
                const sortedByDate = pendingTransactions.sort((a, b) => 
                    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
                );
                
                stats.oldestTransaction = {
                    ref: sortedByDate[0].ref,
                    createdAt: sortedByDate[0].createdAt,
                    paymentMode: sortedByDate[0].paymentMode
                };

                stats.newestTransaction = {
                    ref: sortedByDate[sortedByDate.length - 1].ref,
                    createdAt: sortedByDate[sortedByDate.length - 1].createdAt,
                    paymentMode: sortedByDate[sortedByDate.length - 1].paymentMode
                };
            }

            return stats;
        } catch (error) {
            this.logger.error('❌ Erreur lors de la récupération des statistiques:', error);
            throw error;
        }
    }
}
