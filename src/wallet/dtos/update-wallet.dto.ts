import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';

export class UpdateWalletDTO {
    @ApiProperty({
        description: 'Montant du portefeuille',
        example: 100,
        required: true
    })
    @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Le montant doit être un nombre valide' })
    @Min(0, { message: 'Le montant ne peut pas être négatif' })
    amount: number;
}
