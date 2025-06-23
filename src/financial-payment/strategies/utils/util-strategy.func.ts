import { FinancialTransactionState, FinancialTransactionErrorType } from "src/financial-transaction/enum";

export class UtilStrategyFunc {
    static getResponseStatus(response): Record<string, any> {
        let r = { endDate: new Date().toISOString() };
        
        if (!response || !response.status) {
            r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
            r["error"] = FinancialTransactionErrorType.UNKNOW_ERROR;
            return r;
        }
        
        switch (response.status) {
            case "SUCCESSFUL":
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS;
                r["error"] = FinancialTransactionErrorType.NO_ERROR;
                break;
            case "FAILED":
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                r["error"] = FinancialTransactionErrorType.UNKNOW_ERROR;
                break;
            case "PENDING":
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING;
                r["error"] = FinancialTransactionErrorType.NO_ERROR;
                break;
            case "EXPIRED":
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                r["error"] = FinancialTransactionErrorType.TIMEOUT_PAYMENT;
                break;
            case "CANCELLED":
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                r["error"] = FinancialTransactionErrorType.BUYER_CANCEL_PAYMENT;
                break;
            default:
                r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                r["error"] = FinancialTransactionErrorType.UNKNOW_ERROR;
        }
        
        return r;
    }
}