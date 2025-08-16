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
    
    async makePaiement(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            if (!Object.values(PaymentStrategyType).includes(financialTransaction.paymentMode)) {
                return reject(FinancialTransactionErrorType.PAIMENT_METHOD_NOT_FOUND);
            }

            const paymentMethod = financialTransaction.type == FinancialTransactionType.DEPOSIT
                ? this.paymentBuilder.getMethodPayment(financialTransaction.paymentMode).buy(financialTransaction)
                : this.paymentBuilder.getMethodPayment(financialTransaction.paymentMode).withdrawal(financialTransaction);

            paymentMethod
            .then((result) => {
                console.log("Payment result:", result);
                
                // Gestion améliorée des résultats
                const response = {
                    state: result.error == FinancialTransactionErrorType.NO_ERROR 
                        ? FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING 
                        : FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                    startDate: new Date().toISOString(),
                    endDate: result.error != FinancialTransactionErrorType.NO_ERROR 
                        ? new Date().toISOString() 
                        : null,
                    error: result.error || FinancialTransactionErrorType.NO_ERROR,
                    token: result.token || result.ref || financialTransaction.ref,
                    ref: result.ref || financialTransaction.ref
                };
                
                resolve(response);
            })
            .catch((error) => {
                console.error("Payment service error:", error);
                
                // En cas d'erreur système, marquer comme erreur
                resolve({
                    state: FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                    startDate: new Date().toISOString(),
                    endDate: new Date().toISOString(),
                    error: FinancialTransactionErrorType.UNKNOW_ERROR,
                    token: financialTransaction.ref
                });
            });
        });
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
