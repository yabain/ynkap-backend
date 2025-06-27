import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FinancialTransaction, FinancialTransactionSchema } from './models/financial-transaction.schema';
import { FinancialTransactionService } from './services/financial-transaction.service';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './services/payment.service';
import { PaymentHistoryController } from './controllers/payment-history.controller';
import { ApplicationModule } from '../application/application.module';
import { WalletModule } from '../wallet/wallet.module';
import { FinancialPaymentModule } from '../financial-payment/financial-payment.module';
import { LogsModule } from '../logs/logs.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FinancialTransaction.name, schema: FinancialTransactionSchema }
    ]),
    ApplicationModule,
    WalletModule,
    FinancialPaymentModule,
    LogsModule  // Assurez-vous que LogsModule est importé ici
  ],
  controllers: [
    PaymentController,
    PaymentHistoryController
  ],
  providers: [
    FinancialTransactionService,
    PaymentService
  ],
  exports: [
    FinancialTransactionService,
    PaymentService
  ]
})
export class FinancialTransactionModule {}
