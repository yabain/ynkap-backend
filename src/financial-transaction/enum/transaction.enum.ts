export enum FinancialTransactionType {
    DEPOSIT = "deposit",
    WITHDRAWAL = "withdrawal",
    TRANSFER = "transfer",
    PAYMENT = "payment"
}

export enum FinancialTransactionState
{
    FINANCIAL_TRANSACTION_PENDING="financial_transaction_pending", //Transaction en attente
    FINANCIAL_TRANSACTION_ERROR="financial_transaction_error", //Erreur dans la transaction
    FINANCIAL_TRANSACTION_SUCCESS="financial_transaction_success",//Success de la transaction
    FINANCIAL_TRANSACTION_START="financial_transaction_start",//Transaction démarrer
    FINANCIAL_TRANSACTION_CANCEL = "financial_transaction_cancel", // Ajoute cette ligne
}



export enum FinancialTransactionErrorType
{
    BUYER_NOT_FOUND_ERROR = -201, // Compte du payeur introuvable
    RECEIVER_NOT_FOUND_ERROR = -202, // Receveur introuvable 
    NO_ERROR = 0, // Aucun erreur
    UNKNOW_ERROR = -200, // Erreur inconnue
    INSUFFICIENT_AMOUNT_ERROR = -204, // Montant d'achat insuffisant
    PAIMENT_METHOD_NOT_FOUND = -205, // Methode de paiement introuvable
    INVALID_AMOUNT_ERROR = -206, // Montant invalide
    TIMEOUT_PAYMENT = -207, // Temps de paiement trop long
    BUYER_CANCEL_PAYMENT = -208, // Le payeur a annulé la transaction
    INVALID_PHONE_NUMBER = -209, // Numéro de téléphone invalide
}