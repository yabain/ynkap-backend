import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsEnum, IsMongoId, IsOptional, IsString } from "class-validator";
import { FinancialTransactionState } from "../enum";
import { FinancialTransactionType } from "src/financial-payment/enum";
import { PaymentStrategyType } from "src/financial-payment/enum";

export class TransactionHistoryFilterDTO {
    @ApiProperty({ 
        description: 'ID de l\'application', 
        example: '66bf8a89203d5fab750c0f63',
        required: true 
    })
    @IsMongoId()
    appID: string;

    @ApiProperty({ 
        description: 'Date de début de la période (format ISO)', 
        example: '2024-01-01T00:00:00.000Z',
        required: false 
    })
    @IsOptional()
    @IsDateString()
    startDate?: string;

    @ApiProperty({ 
        description: 'Date de fin de la période (format ISO)', 
        example: '2024-12-31T23:59:59.999Z',
        required: false 
    })
    @IsOptional()
    @IsDateString()
    endDate?: string;

    @ApiProperty({ 
        description: 'État de la transaction', 
        enum: FinancialTransactionState,
        required: false 
    })
    @IsOptional()
    @IsEnum(FinancialTransactionState)
    state?: FinancialTransactionState;

    @ApiProperty({ 
        description: 'Type de transaction (dépôt, retrait)', 
        enum: FinancialTransactionType,
        required: false 
    })
    @IsOptional()
    @IsEnum(FinancialTransactionType)
    type?: FinancialTransactionType;

    @ApiProperty({ 
        description: 'Mode de paiement', 
        enum: PaymentStrategyType,
        required: false 
    })
    @IsOptional()
    @IsEnum(PaymentStrategyType)
    paymentMode?: PaymentStrategyType;

    @ApiProperty({ 
        description: 'Référence de la transaction', 
        example: 'REF1732864911941',
        required: false 
    })
    @IsOptional()
    @IsString()
    ref?: string;
}