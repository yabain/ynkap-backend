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

    @ApiProperty({ description: 'Montant de la transaction', required: true, example: 30 })
    @IsNumber({}, { message: 'Le montant doit être un nombre' })
    @Min(1, { message: 'Le montant doit être supérieur à 0' })
    @IsValidAmount()
    amount: number;

    @ApiProperty({ description: 'Type de transaction', enum: FinancialTransactionType, required: true, example: 'deposit' })
    @IsEnum(FinancialTransactionType, { message: 'Type de transaction invalide' })
    type: FinancialTransactionType;

    @ApiProperty({ description: 'Mode de paiement', enum: PaymentStrategyType, required: true, example: 'ORANGE' })
    @IsEnum(PaymentStrategyType, { message: 'Mode de paiement invalide' })
    paymentMode: PaymentStrategyType;

    @ApiProperty({ description: 'Code de la monnaie', enum: PaymentMoneyCode, required: true, example: 'XAF' })
    @IsEnum(PaymentMoneyCode, { message: 'Code de la monnaie invalide' })
    moneyCode: PaymentMoneyCode;

    @ApiProperty({ description: 'Référence utilisateur', required: false, type: UserRefDTO, example: { fullName: 'ulrich Waba', account: '659396163' } })
    @IsOptional()
    @ValidateNested()
    @Type(() => UserRefDTO)
    userRef?: UserRefDTO;

    @ApiProperty({ description: 'Raison du paiement', required: false, example: 'Paiement de frais de scolarité' })
    @IsOptional()
    @IsString({ message: 'La raison doit être une chaîne de caractères' })
    raison?: string;

    @ApiProperty({ description: 'Numéro de téléphone', required: true, example: '659396163' })
    @IsString({ message: 'Le numéro de téléphone doit être une chaîne de caractères' })
    phoneNumber: string;

    @ApiProperty({ description: 'Description', required: false, example: 'Paiement Orange/MTN' })
    @IsOptional()
    @IsString({ message: 'La description doit être une chaîne de caractères' })
    description?: string;

    @ApiProperty({ description: 'ID utilisateur', required: false })
    @IsOptional()
    @IsString({ message: 'L\'ID utilisateur doit être une chaîne de caractères' })
    userId?: string;

    // Propriétés internes (non exposées dans l'API)
    application?: Application;
    wallet?: Wallet;
    state?: FinancialTransactionState;
}