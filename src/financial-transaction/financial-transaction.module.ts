import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { FinancialTransactionService } from './services/financial-transaction.service';
import { FinancialTransaction, FinancialTransactionSchema } from './models';
import { MtnTestController } from './controllers/mtn-test.controller';
import { PaymentHistoryController } from './controllers/payment-history.controller';
import { FinancialPaymentModule } from 'src/financial-payment/financial-payment.module';
import { ApplicationModule } from 'src/application/application.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FinancialTransaction.name, schema: FinancialTransactionSchema }
    ]),
    HttpModule,
    ConfigModule,
    FinancialPaymentModule,
    ApplicationModule,
    WalletModule,
  ],
  controllers: [MtnTestController, PaymentHistoryController],
  providers: [FinancialTransactionService],
  exports: [FinancialTransactionService],
})
export class FinancialTransactionModule {}
