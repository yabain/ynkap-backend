import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { FinancialPaymentService } from "src/financial-payment/services";
import { CreateFinancialTransactionDTO } from "../dtos";
import { FinancialTransactionService } from "./financial-transaction.service";
import mongoose from "mongoose"
import { InjectConnection } from "@nestjs/mongoose";
import { FinancialTransactionState } from "../enum";
import { WalletService } from "src/wallet/services";
import { FinancialTransactionType, PaymentStrategyType } from "src/financial-payment/enum";
import { ConfigService } from "@nestjs/config";
import { StrategyResponseStatus } from "src/financial-payment/strategies/strategy-response-status.enum";
import { FinancialTransactionDocument, FinancialTransaction } from "../models";
import { UtilStrategyFunc } from "src/financial-payment/strategies/util-strategy-func";
import { ERROR_CODE } from "src/shared/config/errors";
import { TransactionLogService } from 'src/logs/services/transaction-log.service';

@Injectable()
export class PaymentService
{
    constructor(
        private paymentService:FinancialPaymentService,
        private walletService:WalletService,
        private financialTransactionService:FinancialTransactionService,
        private configServie:ConfigService,
        @InjectConnection() private readonly connection:mongoose.Connection,
        private readonly transactionLogService: TransactionLogService
    ){}

    async makePayment(createFinancialTransactionDTO:CreateFinancialTransactionDTO)
    {
        const transaction= await this.connection.startSession();
        transaction.startTransaction();
        let financialTransaction:FinancialTransactionDocument=null;
        try {    
            financialTransaction=await this.financialTransactionService.createNewFinancialTransaction(createFinancialTransactionDTO,transaction);
            
            // Log de création de transaction
            await this.transactionLogService.logTransaction(
                financialTransaction._id.toString(),
                financialTransaction.application.toString(),
                financialTransaction.state,
                financialTransaction.type,
                financialTransaction.amount,
                financialTransaction.paymentMode,
                createFinancialTransactionDTO.userId || financialTransaction.userRef?.fullName
            );
            
            financialTransaction= await this.financialTransactionService.update(
                {_id:financialTransaction._id},
                await this.paymentService.makePaiement(financialTransaction),
                transaction
            );
            
            // Log de mise à jour de l'état de la transaction
            await this.transactionLogService.logTransactionStateChange(
                financialTransaction._id.toString(),
                financialTransaction.application.toString(),
                FinancialTransactionState.FINANCIAL_TRANSACTION_START,
                financialTransaction.state,
                createFinancialTransactionDTO.userId || financialTransaction.userRef?.fullName
            );
            
            await transaction.commitTransaction();
        } catch(err) {
            await transaction.abortTransaction();
            
            // Log d'erreur de transaction
            if (financialTransaction) {
                await this.transactionLogService.logTransaction(
                    financialTransaction._id.toString(),
                    financialTransaction.application.toString(),
                    FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                    financialTransaction.type,
                    financialTransaction.amount,
                    financialTransaction.paymentMode,
                    createFinancialTransactionDTO.userId || financialTransaction.userRef?.fullName,
                    { error: err.message }
                );
            }
            
            throw err;
        } finally {
            transaction.endSession();
        }
        
        return financialTransaction;
    }


    async checkPayment(financialTransactionRef)
    {

        let transaction = await this.connection.startSession(),financialTransaction:FinancialTransactionDocument=null;
        transaction.startTransaction();
        try {
            financialTransaction=await this.financialTransactionService.findOneByField({token:financialTransactionRef})
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

            let error = err.response?.statusCode | err;            
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
            financialTransaction=await this.financialTransactionService.findOneByField({token:payToken})
            // console.log("Direct Update payement",payToken,status,financialTransaction)
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
            console.log("Statut de mise à jour du paiement d’erreur",err)

            throw err

        }
        finally
        {
            transaction.endSession();
        }   
    }

    async updateWallet(financialTransaction,transaction=null)
    {
        if(financialTransaction.type==FinancialTransactionType.DEPOSIT) await this.walletService.increaseWallet(financialTransaction.wallet._id,financialTransaction.amount,transaction)
        else await this.walletService.decreaseWallet(financialTransaction.wallet._id,financialTransaction.amount,transaction)
    }

    /**
     * Met à jour le statut d'un paiement MTN Money
     * @param referenceId Référence de la transaction
     * @param status Statut de la transaction
     * @returns Transaction mise à jour
     */
    async updateMtnPaymentStatus(referenceId: string, status: string): Promise<FinancialTransaction> {
        const transaction = await this.financialTransactionService.findOneByField({ ref: referenceId });
        
        if (!transaction) {
            throw new NotFoundException(`Transaction with reference ${referenceId} not found`);
        }
        
        let newState: FinancialTransactionState;
        
        // Mapper les statuts MTN aux statuts de notre application
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
        
        // Mettre à jour la transaction
        transaction.state = newState;
        transaction.endDate = new Date().toISOString();
        
        return await this.financialTransactionService.update(transaction._id, transaction);
    }
}
