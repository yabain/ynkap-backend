import { FinancialTransaction } from "src/financial-transaction/models"

export interface PaymentMethodStrategy
{
    buy(financialTransaction:FinancialTransaction);
    check(financialTransaction:FinancialTransaction);
    cancel(financialTransaction:FinancialTransaction);
    withdrawal(financialTransaction:FinancialTransaction);
    checkWithdrawal(financialTransaction:FinancialTransaction); //Promise<ActionResult>
}