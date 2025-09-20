import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { FinancialTransactionService } from './services/financial-transaction.service';
import { FinancialTransaction, FinancialTransactionSchema } from './models';
import { MtnTestController } from './controllers/mtn-test.controller';
import { PaymentHistoryController } from './controllers/payment-history.controller';
import { PaymentService } from './services/payment.service';
import { TransactionStatusCheckerService } from './services/transaction-status-checker.service';
import { TransactionStatusCheckerController } from './controllers/transaction-status-checker.controller';
import { FinancialPaymentModule } from 'src/financial-payment/financial-payment.module';
import { ApplicationModule } from 'src/application/application.module';
import { WalletModule } from 'src/wallet/wallet.module';
import { ConfigModule } from '@nestjs/config';
import { LogsModule } from 'src/logs/logs.module';
import { PaymentController } from './controllers/payment.controller'; 

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FinancialTransaction.name, schema: FinancialTransactionSchema }
    ]),
    HttpModule,
    ConfigModule,
    FinancialPaymentModule,
    forwardRef(() => ApplicationModule),
    forwardRef(() => WalletModule),
    forwardRef(() => LogsModule),
  ],
  controllers: [MtnTestController, PaymentHistoryController, PaymentController, TransactionStatusCheckerController],
  providers: [FinancialTransactionService, PaymentService, TransactionStatusCheckerService],
  exports: [FinancialTransactionService, PaymentService, TransactionStatusCheckerService],
})
export class FinancialTransactionModule {}
