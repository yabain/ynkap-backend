import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FinancialTransaction, FinancialTransactionSchema } from "./models";
import { FinancialTransactionService, PaymentService } from "./services";
import { PaymentController } from "./controllers/payment.controller";
import { PaymentHistoryController } from "./controllers/payment-history.controller";
import { ApplicationModule } from "src/application/application.module";
import { FinancialPaymentModule } from "src/financial-payment/financial-payment.module";
import { WalletModule } from "src/wallet/wallet.module";
import { DecreaseAmountValidator } from "./validators/decrease-amount.validator";
import { MtnTestController } from "./controllers/mtn-test.controller";
import { Reflector } from "@nestjs/core";
import { LogsModule } from "src/logs/logs.module";
// import { UserTransactionsController } from './controllers/user-transactions.controller';

@Module({
    imports:[
        MongooseModule.forFeature([{name:FinancialTransaction.name,schema:FinancialTransactionSchema}]),
        ApplicationModule,
        FinancialPaymentModule,
        WalletModule,
        LogsModule // Ajout du module de logs pour accéder à TransactionLogService
    ],
    controllers:[PaymentController, PaymentHistoryController, MtnTestController],
    providers:[
        FinancialTransactionService,
        PaymentService,
        DecreaseAmountValidator,
        Reflector
    ]
})
export class FinancialTransactionModule{}
