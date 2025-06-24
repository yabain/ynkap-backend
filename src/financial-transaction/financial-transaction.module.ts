import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { FinancialTransaction, FinancialTransactionSchema } from "./models/financial-transaction.schema";
import { FinancialTransactionService } from "./services/financial-transaction.service";
import { PaymentService } from "./services/payment.service";
import { PaymentController } from "./controllers/payment.controller";
import { PaymentHistoryController } from "./controllers/payment-history.controller";
import { DecreaseAmountValidator } from "./validators/decrease-amount.validator";
import { ApplicationModule } from "src/application/application.module";
import { FinancialPaymentModule } from "src/financial-payment/financial-payment.module";
import { WalletModule } from "src/wallet/wallet.module";
import { MtnTestController } from "./controllers/mtn-test.controller";
import { Reflector, APP_INTERCEPTOR } from "@nestjs/core";
import { LogsModule } from "src/logs/logs.module";
import { TransactionLoggerInterceptor } from "src/logs/interceptors/transaction-logger.interceptor";

@Module({
    imports:[
        MongooseModule.forFeature([{name:FinancialTransaction.name,schema:FinancialTransactionSchema}]),
        ApplicationModule,
        FinancialPaymentModule,
        WalletModule,
        LogsModule
    ],
    controllers:[PaymentController, PaymentHistoryController, MtnTestController],
    providers:[
        FinancialTransactionService,
        PaymentService,
        DecreaseAmountValidator,
        Reflector,
        {
            provide: APP_INTERCEPTOR,
            useClass: TransactionLoggerInterceptor,
        }
    ]
})
export class FinancialTransactionModule{}
