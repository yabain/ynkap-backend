import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class WithdrawWalletDTO {
    @ApiProperty({
        description: 'Montant à retirer du portefeuille',
        example: 50,
        required: true
    })
    @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Le montant doit être un nombre valide' })
    @Min(0.01, { message: 'Le montant doit être supérieur à 0' })
    amount: number;
}