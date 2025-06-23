import { ApiProperty } from "@nestjs/swagger";
import { FinancialTransactionState } from "../enum";
import { FinancialTransactionType, PaymentStrategyType, PaymentMoneyCode } from "src/financial-payment/enum";

export class TransactionResponseDTO {
    @ApiProperty({ example: '66bf8a89203d5fab750c0f63' })
    _id: string;

    @ApiProperty({ example: 'financial_transaction_success', enum: FinancialTransactionState })
    state: FinancialTransactionState;

    @ApiProperty({ example: 1000 })
    amount: number;

    @ApiProperty({ example: 'Paiement de frais de scolarité' })
    raison: string;

    @ApiProperty({ example: 'deposit', enum: FinancialTransactionType })
    type: FinancialTransactionType;

    @ApiProperty({ example: 'REF1732864911941' })
    ref: string;

    @ApiProperty({ example: 'MP241129DD2D67ABACD8CC4D4496' })
    token: string;

    @ApiProperty({ example: 0 })
    error: number;

    @ApiProperty({ example: 'ORANGE', enum: PaymentStrategyType })
    paymentMode: PaymentStrategyType;

    @ApiProperty({ example: '6749689642bafee2045b382c' })
    application: string;

    @ApiProperty({ example: 'XAF', enum: PaymentMoneyCode })
    moneyCode: PaymentMoneyCode;

    @ApiProperty({ example: '6749689642bafee2045b382e' })
    wallet: string;

    @ApiProperty({ example: '2024-11-29T07:21:51.941Z' })
    createdAt: Date;

    @ApiProperty({ example: '2024-11-29T07:25:14.895Z' })
    startDate: Date;

    @ApiProperty({ example: '2024-11-29T07:25:14.895Z' })
    endDate: Date;

    @ApiProperty({
        example: {
            fullName: 'Cédric Nguendap',
            account: '698295368'
        }
    })
    userRef: {
        fullName: string;
        account: string;
    };
}