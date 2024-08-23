import { Injectable, NotFoundException } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Wallet, WalletDocument } from "../models/wallet.schema";
import { Connection, Model, ObjectId } from "mongoose";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { application } from "express";

@Injectable()
export class WalletServices extends DataBaseService<WalletDocument> {
    constructor(
        @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
        @InjectConnection() connection: Connection
        )
        {
            super(walletModel, connection)
        }

        async getAmount(id): Promise<any>{
            const wallet = await this.findOneByField({application: id}, {_id:0, application:0, isDeleted:0, createdAt:0});
            
            if(!wallet)
                throw new NotFoundException(`The wallet with the ID ${id} cannot be found`);
            
            return wallet;
        }

        async getAmounts(applicationIds: any[]): Promise<Map<string,number>>{
            const wallets = await this.walletModel.find({ application: {$in: applicationIds} })
            if(!wallets)
                throw new NotFoundException(`No wallet matches the specified ids`)
            
            const amountMap = new Map<string, number>()
            
            wallets.forEach(wallet => {
                amountMap.set(wallet.application.toString(), wallet.amount)
            })

            return amountMap;
        }
}