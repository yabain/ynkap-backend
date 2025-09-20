export enum FinancialTransactionType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    TRANSFER = "transfer",
    PAYMENT = "payment"
}

export enum FinancialTransactionState {
    FINANCIAL_TRANSACTION_START = "financial_transaction_start",
    FINANCIAL_TRANSACTION_PENDING = "financial_transaction_pending",
    FINANCIAL_TRANSACTION_ERROR = "financial_transaction_error",
    FINANCIAL_TRANSACTION_SUCCESS = "financial_transaction_success",
    FINANCIAL_TRANSACTION_CANCEL = "financial_transaction_cancel"
}

export enum FinancialTransactionErrorType {
    BUYER_NOT_FOUND_ERROR = -201,
    RECEIVER_NOT_FOUND_ERROR = -202,
    NO_ERROR = 0,
    UNKNOW_ERROR = -200,
    INSUFFICIENT_AMOUNT_ERROR = -204,
    PAIMENT_METHOD_NOT_FOUND = -205,
    INVALID_AMOUNT_ERROR = -206,
    TIMEOUT_PAYMENT = -207,
    BUYER_CANCEL_PAYMENT = -208,
    INVALID_PHONE_NUMBER = -209
}
