import { ApiProperty } from '@nestjs/swagger';

export class DashboardStatsDTO {
  @ApiProperty({
    description: 'Nombre total d\'utilisateurs',
    example: 150
  })
  amountOfUser: number;

  @ApiProperty({
    description: 'Méthode de paiement utilisée (MTN Money, Orange Money, PayPal, etc.)',
    example: 'MTN Money'
  })
  paymentMethod: string;

  @ApiProperty({
    description: 'Nombre total de transactions pour toutes les applications d\'un utilisateur',
    example: 42
  })
  allTransactionOfAllApplicationForAnUser: number;

  @ApiProperty({
    description: 'Nombre d\'applications créées par l\'utilisateur',
    example: 3
  })
  numberOfApplication: number;
}
