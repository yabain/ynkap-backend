import { Module } from '@nestjs/common';
import { ApplicationModule } from '../application/application.module';
import { WalletModule } from '../wallet/wallet.module';
import { FinancialTransactionModule } from '../financial-transaction/financial-transaction.module';
import { FinancialPaymentModule } from '../financial-payment/financial-payment.module';

@Module({
  imports: [
    ApplicationModule,
    WalletModule,
    FinancialTransactionModule,
    FinancialPaymentModule
  ],
  exports: [
    ApplicationModule,
    WalletModule,
    FinancialTransactionModule,
    FinancialPaymentModule
  ]
})
export class CoreModule {}
