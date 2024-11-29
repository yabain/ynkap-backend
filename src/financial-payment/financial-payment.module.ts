import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { PaymentBuilder } from "./builder/payment.builder";
import { FinancialPaymentService } from "./services";
import { MtnMoneyStrategyPayment } from "./strategies/mtn-money";
import { OrangeMoneyStrategyPayment } from "./strategies/orange-money";

@Module({
    imports:[
        HttpModule
    ],
    providers:[
        FinancialPaymentService,
        MtnMoneyStrategyPayment,
        OrangeMoneyStrategyPayment,
        PaymentBuilder,
    ],
    exports:[ FinancialPaymentService ]
})
export class FinancialPaymentModule{}