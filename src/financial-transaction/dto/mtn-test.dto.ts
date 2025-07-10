import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString, IsOptional, Min, Matches } from 'class-validator';
import { Type } from 'class-transformer';

export class MtnDepositDto {
  @ApiProperty({
    description: 'Montant du dépôt',
    example: 100
  })
  @IsNotEmpty({ message: 'Le montant est requis' })
  @IsNumber({}, { message: 'Le montant doit être un nombre' })
  @Min(1, { message: 'Le montant doit être supérieur à 0' })
  @Type(() => Number)
  amount: number;

  @ApiProperty({
    description: 'Numéro de téléphone MTN (avec ou sans préfixe 237)',
    example: '237671162552'
  })
  @IsNotEmpty({ message: 'Le numéro de téléphone est requis' })
  @IsString({ message: 'Le numéro de téléphone doit être une chaîne de caractères' })
  @Matches(/^(237)?[6-9][0-9]{8}$/, { 
    message: 'Format de numéro de téléphone invalide. Format attendu: 237XXXXXXXXX ou XXXXXXXXX' 
  })
  phoneNumber: string;

  @ApiPropertyOptional({
    description: 'Description de la transaction',
    example: 'Test deposit'
  })
  @IsOptional()
  @IsString({ message: 'La description doit être une chaîne de caractères' })
  description?: string;

  @ApiPropertyOptional({
    description: 'ID de l\'application',
    example: '66bf8a89203d5fab750c0f63'
  })
  @IsOptional()
  @IsString({ message: 'L\'ID de l\'application doit être une chaîne de caractères' })
  applicationId?: string;

  @ApiPropertyOptional({
    description: 'ID du portefeuille',
    example: '66bf8a89203d5fab750c0f64'
  })
  @IsOptional()
  @IsString({ message: 'L\'ID du portefeuille doit être une chaîne de caractères' })
  walletId?: string;
}
