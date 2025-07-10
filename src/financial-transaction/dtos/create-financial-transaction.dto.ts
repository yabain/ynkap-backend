import { Type } from "class-transformer";
import {
    MaxLength, Min, IsEnum, IsNumberString, IsMongoId, 
    MinLength, IsString, IsOptional, IsUrl, IsNotEmpty, 
    IsJSON, IsNumber, IsDefined, IsNotEmptyObject, ValidateNested
} from "class-validator";
import { ApiProperty } from "@nestjs/swagger";
import { Application } from "src/application/models";
import { FinancialTransactionType, PaymentStrategyType, PaymentMoneyCode } from "src/financial-payment/enum";
import { Wallet } from "src/wallet/models";
import { IsValidAmount } from "../decorators/decrease-amount.decorator";
import { FinancialTransactionState } from "../enum";
import { UserRefDTO } from "./user-ref.dto";



export class CreateFinancialTransactionDTO
{
    @ApiProperty({ description: 'ID de l\'application', required: true })
    @IsMongoId({ message: 'L\'ID de l\'application doit être un ID MongoDB valide' })
    @IsNotEmpty({ message: 'L\'ID de l\'application est requis' })
    appID: string;

    @ApiProperty({ description: 'Montant de la transaction', required: true })
    @IsNumber({}, { message: 'Le montant doit être un nombre' })
    @Min(1, { message: 'Le montant doit être supérieur à 0' })
    @IsValidAmount()
    amount: number;

    @ApiProperty({ description: 'Type de transaction', enum: FinancialTransactionType, required: true })
    @IsEnum(FinancialTransactionType, { message: 'Type de transaction invalide' })
    type: FinancialTransactionType;

    @ApiProperty({ description: 'Mode de paiement', enum: PaymentStrategyType, required: true })
    @IsEnum(PaymentStrategyType, { message: 'Mode de paiement invalide' })
    paymentMode: PaymentStrategyType;

    @ApiProperty({ description: 'Référence utilisateur', required: false, type: UserRefDTO })
    @IsOptional()
    @ValidateNested()
    @Type(() => UserRefDTO)
    userRef?: UserRefDTO;

    @ApiProperty({ description: 'ID utilisateur', required: false })
    @IsOptional()
    @IsString({ message: 'L\'ID utilisateur doit être une chaîne de caractères' })
    userId?: string;

    // Propriétés internes (non exposées dans l'API)
    application: Application;
    wallet: Wallet;
    state?: FinancialTransactionState;
}
