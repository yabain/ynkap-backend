import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';

export class CreateWalletDTO {
    @ApiProperty({
        description: 'Montant initial du portefeuille',
        example: 0,
        required: false,
        default: 0
    })
    @IsOptional()
    @IsNumber({ allowNaN: false, allowInfinity: false }, { message: 'Le montant doit être un nombre valide' })
    @Min(0, { message: 'Le montant ne peut pas être négatif' })
    amount?: number = 0;
}
