import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { Wallet, WalletSchema } from "./models/wallet.schema";
import { WalletServices } from "./services/wallet.services";

@Module({
    imports: [
        MongooseModule.forFeature([
            {
                name: Wallet.name,
                schema: WalletSchema
            }
        ])
    ],
    controllers: [],
    exports: [WalletServices],
    providers: [WalletServices]
})
export class WalletModule {}