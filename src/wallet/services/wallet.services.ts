import { Injectable } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Wallet, WalletDocument } from "../models/wallet.schema";
import { Connection, Model } from "mongoose";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";

@Injectable()
export class WalletServices extends DataBaseService<WalletDocument> {
    constructor(
        @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
        @InjectConnection() connection: Connection
        )
        {
            super(walletModel, connection)
        }
}