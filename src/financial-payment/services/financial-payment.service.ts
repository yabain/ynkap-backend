import { Injectable } from "@nestjs/common"
import { FinancialTransactionErrorType, FinancialTransactionState} from "src/financial-transaction/enum";
import { FinancialTransaction } from "src/financial-transaction/models";
import { PaymentBuilder } from "../builder/payment.builder";
import { FinancialTransactionType, PaymentStrategyType } from "../enum";

@Injectable()
export class FinancialPaymentService
{
    constructor(private paymentBuilder:PaymentBuilder){}

    /**
     * Retourne le builder de paiement
     * @returns PaymentBuilder
     */
    getPaymentBuilder(): PaymentBuilder {
        return this.paymentBuilder;
    }
    
    makePaiement(financialTransaction:FinancialTransaction):Promise<any>
    {
        return new Promise<any>((resolve,reject)=>{
            if(!Object.values(PaymentStrategyType).includes(financialTransaction.paymentMode)) return Promise.reject(FinancialTransactionErrorType.PAIMENT_METHOD_NOT_FOUND);

            let paymentMethod=financialTransaction.type==FinancialTransactionType.DEPOSIT
                                ?this.paymentBuilder.getMethodPayment(financialTransaction.paymentMode ).buy(financialTransaction)
                                :this.paymentBuilder.getMethodPayment(financialTransaction.paymentMode ).withdrawal(financialTransaction);

            paymentMethod.then((result)=>{
                // if(result.token) financialTransaction.token=result.token
                resolve({
                    state:result.error==FinancialTransactionErrorType.NO_ERROR?FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING:FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                    startDate:new Date().toISOString(),
                    endDate:new Date().toISOString(),
                    error:result.error,
                    token:result.token
                })
            })
            .catch((error)=> {
                console.log("Error ",error.response)
                reject(error)
            });
        })
    }

    checkPaiement(financialTransaction:FinancialTransaction):Promise<any>
    {
        let r:{state:FinancialTransactionState,error:FinancialTransactionErrorType,endDate:String}={endDate:"",error:FinancialTransactionErrorType.NO_ERROR,state:FinancialTransactionState.FINANCIAL_TRANSACTION_START};
        return new Promise<any>((resolve,reject)=>{
            let strategyPayment = this.paymentBuilder.getMethodPayment(financialTransaction.paymentMode)
            let checkPromise = financialTransaction.type==FinancialTransactionType.DEPOSIT? strategyPayment.check(financialTransaction):strategyPayment.checkWithdrawal(financialTransaction);
            
            checkPromise.then((result:any)=>{
                r={
                    state:result.status,
                    error:result.error,
                    endDate:result.endDate
                };
                console.log("Resultat ", r)
                resolve(r)
            })
            .catch((error)=>reject(error))
        })
    }
    cancelPaiement(financialTransaction:FinancialTransaction,paiementMethod:PaymentStrategyType):Promise<any>
    {
        throw new Error("Method not implemented.");
    }
    
}
