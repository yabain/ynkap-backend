import { HttpException, HttpStatus, Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common";
    import { FinancialPaymentService } from "src/financial-payment/services";
    import { CreateFinancialTransactionDTO } from "../dtos";
    import { FinancialTransactionService } from "./financial-transaction.service";
    import mongoose from "mongoose";
    import { InjectConnection } from "@nestjs/mongoose";
    import { FinancialTransactionState } from "../enum";
    import { WalletService } from "src/wallet/services/wallet.service";
    import { FinancialTransactionType, PaymentStrategyType } from "src/financial-payment/enum";
    import { ConfigService } from "@nestjs/config";
    import { FinancialTransactionDocument } from "../models";
    import { TransactionLogService } from 'src/logs/services/transaction-log.service';
    import { UtilStrategyFunc } from "src/financial-payment/strategies/util-strategy-func";

    // Définir ERROR_CODE avec des valeurs numériques
    const ERROR_CODE = {
        RESSOURCE_NOT_FOUND_ERROR: 404,
        UNKNOW_ERROR: 500
    };

    @Injectable()
    export class PaymentService
    {
        constructor(
            private paymentService: FinancialPaymentService,
            @Inject(forwardRef(() => WalletService)) private walletService: WalletService,
            private financialTransactionService: FinancialTransactionService,
            private configService: ConfigService,
            @InjectConnection() private readonly connection: mongoose.Connection,
            @Inject(forwardRef(() => TransactionLogService)) private readonly transactionLogService: TransactionLogService
        ){}

        async makePayment(createFinancialTransactionDTO: CreateFinancialTransactionDTO) {
            const transaction = await this.connection.startSession();
            transaction.startTransaction();
            let financialTransaction: FinancialTransactionDocument = null;
            try {    
                financialTransaction = await this.financialTransactionService.createNewFinancialTransaction(createFinancialTransactionDTO, transaction);
                
                const transactionId = financialTransaction._id.toString();
                const applicationId = financialTransaction.application?.toString();
                const userId = createFinancialTransactionDTO.userId || 
                            (financialTransaction.userRef?.fullName ? financialTransaction.userRef.fullName : 'Unknown');
                
                await this.transactionLogService.logTransaction(
                    transactionId,
                    applicationId,
                    financialTransaction.state,
                    financialTransaction.type,
                    financialTransaction.amount,
                    financialTransaction.paymentMode,
                    userId
                );
                
                financialTransaction = await this.financialTransactionService.update(
                    {_id:financialTransaction._id},
                    await this.paymentService.makePaiement(financialTransaction),
                    transaction
                );
                
                await this.transactionLogService.logTransactionStateChange(
                    transactionId,
                    applicationId,
                    FinancialTransactionState.FINANCIAL_TRANSACTION_START,
                    financialTransaction.state,
                    userId
                );
                
                await transaction.commitTransaction();
            } catch(err) {
                await transaction.abortTransaction();
                
                if (financialTransaction) {
                    const transactionId = financialTransaction._id.toString();
                    const applicationId = financialTransaction.application?.toString();
                    const userId = createFinancialTransactionDTO.userId || 
                                (financialTransaction.userRef?.fullName ? financialTransaction.userRef.fullName : 'Unknown');
                    
                    await this.transactionLogService.logTransaction(
                        transactionId,
                        applicationId,
                        FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                        financialTransaction.type,
                        financialTransaction.amount,
                        financialTransaction.paymentMode,
                        userId,
                        undefined, // userName
                        { error: err.message }
                    );
                }
                
                throw err;
            } finally {
                transaction.endSession();
            }
            
            return financialTransaction;
        }


        async checkPayment(financialTransactionRef: string) {
            let transaction = await this.connection.startSession(),financialTransaction:FinancialTransactionDocument=null;
            transaction.startTransaction();
            try {
                financialTransaction=await this.financialTransactionService.findOneDocument({token: financialTransactionRef})
                if(!financialTransaction) throw new NotFoundException(`Transaction token ${financialTransactionRef} not found`);
                if(financialTransaction.state==FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR || financialTransaction.state==FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS)
                    return financialTransaction;

                financialTransaction= await this.financialTransactionService.update(
                    {_id:financialTransaction._id},
                    await this.paymentService.checkPaiement(financialTransaction),
                    transaction
                );

                if(financialTransaction.state==FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS) await this.updateWallet(financialTransaction,transaction)
                await transaction.commitTransaction();
            } 
            catch(err)
            {
                await transaction.abortTransaction();

                let error = err.response?.statusCode || err.status || HttpStatus.INTERNAL_SERVER_ERROR;            
                switch(error)
                {
                    case ERROR_CODE.RESSOURCE_NOT_FOUND_ERROR:
                    case HttpStatus.NOT_FOUND:
                        throw new NotFoundException({
                            statusCode:HttpStatus.NOT_FOUND,
                            message:`Transaction id ${financialTransactionRef} not found`
                        });
                        break;
                    case ERROR_CODE.UNKNOW_ERROR:
                        return financialTransaction;
                }
            }
            finally
            {
                transaction.endSession();
            }   
            return financialTransaction;
        }

        async updatePayementStatus(payToken:string,status:string)
        {
            let transaction = await this.connection.startSession(),financialTransaction=null;
            transaction.startTransaction();
            try {
                financialTransaction=await this.financialTransactionService.findOneDocument({token: payToken})
                if(!financialTransaction) throw new NotFoundException({
                    status:HttpStatus.NOT_FOUND,
                    message:`Transaction PayToken ${payToken} not found`
                });
                if(financialTransaction.state==FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR || financialTransaction.state==FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS)
                    return financialTransaction;

                financialTransaction= await this.financialTransactionService.update(
                    {_id:financialTransaction._id},
                    {
                        ...UtilStrategyFunc.getResponseStatus({data:{status}})
                    },
                    transaction
                );

                if(financialTransaction.state==FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS) await this.updateWallet(financialTransaction,transaction)
                await transaction.commitTransaction();
            } 
            catch(err)
            {
                await transaction.abortTransaction();
                console.log("Statut de mise à jour du paiement d'erreur",err)
                throw err
            }
            finally
            {
                transaction.endSession();
            }   
        }

        async updateWallet(financialTransaction, transaction=null)
        {
            if(financialTransaction.type==FinancialTransactionType.DEPOSIT) 
                await this.walletService.increaseWallet(financialTransaction.wallet._id, financialTransaction.amount, transaction);
            else 
                await this.walletService.decreaseWallet(financialTransaction.wallet._id, financialTransaction.amount, transaction);
        }

        /**
         * Met à jour le statut d'un paiement MTN Money
         * @param referenceId Référence de la transaction
         * @param status Statut de la transaction
         * @returns Transaction mise à jour
         */
        async updateMtnPaymentStatus(referenceId: string, status: string): Promise<FinancialTransactionDocument> {
            const transaction = await this.financialTransactionService.findOneDocument({ ref: referenceId });
            
            if (!transaction) {
                throw new NotFoundException(`Transaction with reference ${referenceId} not found`);
            }
            
            let newState: FinancialTransactionState;
            
            switch (status.toUpperCase()) {
                case 'SUCCESSFUL':
                    newState = FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS;
                    break;
                case 'FAILED':
                    newState = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                    break;
                case 'PENDING':
                    newState = FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING;
                    break;
                default:
                    newState = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
            }
            
            transaction.state = newState;
            transaction.endDate = new Date().toISOString();
            
            return await this.financialTransactionService.update(transaction._id, transaction);
        }
    }
