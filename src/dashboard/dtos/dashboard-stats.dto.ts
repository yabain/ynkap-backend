import { ApiProperty } from '@nestjs/swagger';

export class TransactionDTO {
  @ApiProperty({ description: 'ID de la transaction', example: '60d21b4667d0d8992e610c85' })
  _id: string;

  @ApiProperty({ description: 'Référence de la transaction', example: 'TRX-123456' })
  ref: string;

  @ApiProperty({ description: 'Montant de la transaction', example: 5000 })
  amount: number;

  @ApiProperty({ description: 'Code de la monnaie', example: 'XAF' })
  moneyCode: string;

  @ApiProperty({ description: 'État de la transaction', example: 'financial_transaction_success' })
  state: string;

  @ApiProperty({ description: 'Type de transaction', example: 'PAYMENT' })
  type: string;

  @ApiProperty({ description: 'Mode de paiement', example: 'MTN_MONEY' })
  paymentMode: string;

  @ApiProperty({ description: 'Date de création', example: '2023-06-15T10:30:00.000Z' })
  createdAt: Date;

  @ApiProperty({ description: 'ID de l\'application', example: '60d21b4667d0d8992e610c86' })
  application: string;
}

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
    description: 'Toutes les transactions pour toutes les applications d\'un utilisateur',
    type: [TransactionDTO]
  })
  allTransactionOfAllApplicationForAnUser: TransactionDTO[];

  @ApiProperty({
    description: 'Nombre d\'applications créées par l\'utilisateur',
    example: 3
  })
  numberOfApplication: number;
}

