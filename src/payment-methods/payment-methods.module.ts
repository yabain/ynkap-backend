import { Module } from "@nestjs/common";
import { PaymentMethodController } from "./controllers/payment-method.controller";
import { PaymentMethodService } from "./services/payment-method.service";
import { MongooseModule } from "@nestjs/mongoose";
import { PaymentMethod, paymentMethodSchema } from "./models/payment-method.model";
import { ApplicationModule } from "src/application/application.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: PaymentMethod.name,
                schema: paymentMethodSchema
            }
        ]),
        ApplicationModule
    ],
    controllers: [PaymentMethodController],
    exports: [],
    providers: [PaymentMethodService]
})
export class PaymentMethodsModule {}