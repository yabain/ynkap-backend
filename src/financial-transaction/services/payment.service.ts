import { HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { FinancialPaymentService } from "src/financial-payment/services";
import { CreateFinancialTransactionDTO } from "../dtos";
import { FinancialTransactionService } from "./financial-transaction.service";
import mongoose from "mongoose"
import { InjectConnection } from "@nestjs/mongoose";
import { FinancialTransactionState } from "../enum";
import { WalletService } from "src/wallet/services";
import { FinancialTransactionType } from "src/financial-payment/enum";
import { ConfigService } from "@nestjs/config";
import { StrategyResponseStatus } from "src/financial-payment/strategies/strategy-response-status.enum";
import { FinancialTransactionDocument } from "../models";
import { UtilStrategyFunc } from "src/financial-payment/strategies/util-strategy-func";
import { ERROR_CODE } from "src/shared/config/errors";

@Injectable()
export class PaymentService
{
    constructor(
        private paymentService:FinancialPaymentService,
        private walletService:WalletService,
        private financialTransactionService:FinancialTransactionService,
        private configServie:ConfigService,
        @InjectConnection() private readonly connection:mongoose.Connection
    ){}

    async makePayment(createFinancialTransactionDTO:CreateFinancialTransactionDTO)
    {
        const transaction= await this.connection.startSession();
        transaction.startTransaction();
        let financialTransaction:FinancialTransactionDocument=null;
        try {    
            financialTransaction=await this.financialTransactionService.createNewFinancialTransaction(createFinancialTransactionDTO,transaction);
        //    console.log("financialTransaction1", financialTransaction)
            financialTransaction= await this.financialTransactionService.update(
                {_id:financialTransaction._id},
                await this.paymentService.makePaiement(financialTransaction),
                transaction
            );
            await transaction.commitTransaction();
        } 
        catch(err)
        {
            await transaction.abortTransaction();
            throw err
        }
        finally
        {
            transaction.endSession();
        }     

        return  financialTransaction;
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
            console.log("Error Payement Update Status",err)

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
}