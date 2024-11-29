import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Wallet, WalletSchema } from "./models/wallet.schema";
import { WalletService } from "./services";
import { WalletController } from "./controllers";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Wallet.name,
                schema: WalletSchema
            }
        ])
    ],
    controllers: [
        WalletController
    ],
    exports: [WalletService],
    providers: [WalletService]
})
export class WalletModule {}