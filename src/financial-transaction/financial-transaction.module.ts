import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { ApplicationModule } from "src/application/application.module";
import { FinancialPaymentModule } from "src/financial-payment/financial-payment.module";
import { WalletModule } from "src/wallet/wallet.module";
import { PaymentController, PaymentHistoryController } from "./controllers";
import { FinancialTransaction, FinancialTransactionSchema } from "./models";
import { FinancialTransactionService, PaymentService } from "./services";
import { DecreaseAmountValidator } from "./validators";

@Module({
    imports:[
        MongooseModule.forFeature([{name:FinancialTransaction.name,schema:FinancialTransactionSchema}]),
        ApplicationModule,
        FinancialPaymentModule,
        WalletModule
    ],
    controllers:[PaymentController, PaymentHistoryController],
    providers:[
        FinancialTransactionService,
        PaymentService,
        DecreaseAmountValidator
    ]
})
export class FinancialTransactionModule{}