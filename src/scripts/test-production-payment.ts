import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MtnMoneyStrategyPayment } from '../financial-payment/strategies/mtn-money/mtn-money.strategy';
import { FinancialTransactionService } from '../financial-transaction/services/financial-transaction.service';
import { FinancialTransactionType, PaymentStrategyType } from '../financial-payment/enum';
import { FinancialTransactionState, FinancialTransactionErrorType } from '../financial-transaction/enum';
import { v4 as uuidv4 } from 'uuid';
import mongoose from 'mongoose';

async function testProductionPayment() {
    console.log('🧪 === TEST PAIEMENT PRODUCTION === 🧪');
    
    const app = await NestFactory.createApplicationContext(AppModule);
    const mtnStrategy = app.get(MtnMoneyStrategyPayment);
    const transactionService = app.get(FinancialTransactionService);
    
    try {
        // Créer une transaction directement avec la structure correcte
        const transactionData = {
            ref: uuidv4(),
            amount: 100,
            phoneNumber: '671162552', // Utilisez phoneNumber comme dans votre modèle
            description: 'Test production Y-Nkap',
            type: FinancialTransactionType.DEPOSIT,
            state: FinancialTransactionState.FINANCIAL_TRANSACTION_START,
            raison: 'Test production Y-Nkap',
            moneyCode: 'XAF',
            startDate: new Date(),
            endDate: new Date(),
            error: FinancialTransactionErrorType.NO_ERROR,
            token: '',
            paymentMode: PaymentStrategyType.MTN_MONEY,
            application: new mongoose.Types.ObjectId(),
            userRef: { fullName: 'ulrich Waba', account: '671162552' },
            wallet: new mongoose.Types.ObjectId(),
            createdAt: new Date()
        };
        
        console.log('🚀 Création de la transaction...');
        const savedTransaction = await transactionService.create(transactionData);
        console.log('Transaction créée avec ID:', savedTransaction._id);
        
        console.log('💳 Initiation du paiement MTN...');
        const result = await mtnStrategy.buy(savedTransaction);
        
        console.log('✅ Résultat du paiement:');
        console.log('- Statut:', result.status);
        console.log('- Référence:', result.ref);
        console.log('- Token:', result.token);
        console.log('- Erreur:', result.error);
        
        if (result.token && result.error === FinancialTransactionErrorType.NO_ERROR) {
            console.log('\n⏳ Vérification du statut dans 30 secondes...');
            setTimeout(async () => {
                try {
                    const status = await mtnStrategy.check(savedTransaction);
                    console.log('📊 Statut final:', status.status);
                    
                    // Mettre à jour la transaction
                    if (status.status === 'SUCCESSFUL') {
                        await transactionService.update(savedTransaction._id, {
                            state: FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS,
                            endDate: new Date()
                        });
                        console.log('✅ Transaction marquée comme réussie');
                    } else if (status.status === 'FAILED') {
                        await transactionService.update(savedTransaction._id, {
                            state: FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                            endDate: new Date()
                        });
                        console.log('❌ Transaction marquée comme échouée');
                    }
                } catch (error) {
                    console.error('❌ Erreur de vérification:', error.message);
                }
                await app.close();
            }, 30000);
        } else {
            console.log('❌ Paiement échoué immédiatement');
            await app.close();
        }
        
    } catch (error) {
        console.error('❌ Erreur de test:', error.message);
        console.error('Stack:', error.stack);
        await app.close();
    }
}

testProductionPayment();

