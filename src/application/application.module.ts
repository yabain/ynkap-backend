import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Application, ApplicationSchema } from "./models/application.schema";
import { ApplicationController } from "./controllers/application.controller";
import { ApplicationService } from "./services/application.services";
import { Wallet, WalletSchema } from "src/wallet/models/wallet.schema";
import { WalletModule } from "src/wallet/wallet.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Application.name,
                schema: ApplicationSchema
            },
            {
                name: Wallet.name,
                schema: WalletSchema
            }
        ]),
    ],
    controllers: [ApplicationController],
    exports: [ApplicationService],
    providers: [ApplicationService]
})
export class ApplicationModule {}