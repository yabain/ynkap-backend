import { FinancialTransactionState, FinancialTransactionErrorType } from "src/financial-transaction/enum";
import { StrategyResponseStatus } from "./strategy-response-status.enum";

export class UtilStrategyFunc 
{
    static getResponseStatus(response):Record<string,any>
    {
        let r = {endDate:new Date().toISOString()};
        switch(response.data.status)
        {
            case StrategyResponseStatus.SUCCESSFUL: 
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS
                r["error"] = FinancialTransactionErrorType.NO_ERROR
                break;
            case StrategyResponseStatus.FAILED:
                switch(response.data.reason.code)
                {
                    case StrategyResponseStatus.PAYER_NOT_FOUND:
                        r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR
                        r["error"] = FinancialTransactionErrorType.BUYER_NOT_FOUND_ERROR
                        break;

                    case StrategyResponseStatus.PAYEE_NOT_FOUND:
                        r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR
                        r["error"] = FinancialTransactionErrorType.RECEIVER_NOT_FOUND_ERROR
                        break;
                    default:
                        r["status"]=FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                        r["error"] = FinancialTransactionErrorType.UNKNOW_ERROR
                }
                break;
            case StrategyResponseStatus.PENDING:
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING
                r["error"] = FinancialTransactionErrorType.NO_ERROR
                break;
            case StrategyResponseStatus.EXPIRED:
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR
                r["error"] = FinancialTransactionErrorType.TIMEOUT_PAYMENT
                break;
            case StrategyResponseStatus.CANCELLED:
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR
                r["error"] = FinancialTransactionErrorType.BUYER_CANCEL_PAYMENT
                break;
        }
        return r;
    }
}