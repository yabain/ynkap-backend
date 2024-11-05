import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Application, ApplicationSchema } from "./models/application.schema";
import { ApplicationController } from "./controllers/application.controller";
import { ApplicationService } from "./services/application.services";
import { WalletModule } from "src/wallet/wallet.module";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Application.name,
                schema: ApplicationSchema
            }
        ]),
        WalletModule
    ],
    controllers: [ApplicationController],
    providers: [ApplicationService],
    exports: [ApplicationService]
})
export class ApplicationModule {}