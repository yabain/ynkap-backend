import { Injectable, NotFoundException } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Wallet, WalletDocument } from "../models/wallet.schema";
import { Connection, Model, ObjectId } from "mongoose";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";

@Injectable()
export class WalletService extends DataBaseService<WalletDocument> {
    constructor(
        @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
        @InjectConnection() connection: Connection
    ) {
        super(walletModel, connection);
    }

    async getAmount(id): Promise<any> {
        const wallet = await this.findOneByField({application: id}, {_id:0, application:0, isDeleted:0, createdAt:0});
        
        if(!wallet)
            throw new NotFoundException(`The wallet with the ID ${id} cannot be found`);
        
        return wallet;
    }

    async getAmounts(applicationIds: any[]): Promise<Map<string, number>> {
        console.log('WalletService.getAmounts appelé avec IDs:', applicationIds);
        try {
            const wallets = await this.findByField({
                application: { $in: applicationIds }
            });
            console.log(`${wallets.length} portefeuilles trouvés`);
            
            const amountsMap = new Map<string, number>();
            
            wallets.forEach(wallet => {
                const appId = wallet.application.toString();
                amountsMap.set(appId, wallet.amount || 0);
                console.log(`Portefeuille pour application ${appId}: montant = ${wallet.amount || 0}`);
            });
            
            // Vérifier les applications sans portefeuille
            applicationIds.forEach(appId => {
                const appIdStr = appId.toString();
                if (!amountsMap.has(appIdStr)) {
                    console.log(`Aucun portefeuille trouvé pour l'application ${appIdStr}, définition du montant à 0`);
                    amountsMap.set(appIdStr, 0);
                }
            });
            
            return amountsMap;
        } catch (error) {
            console.error('Erreur dans WalletService.getAmounts:', error);
            throw error;
        }
    }

    async increaseWallet(walletID, amount: number, session = null): Promise<WalletDocument> {
        let wallet = await this.findOneByField({"_id": walletID});
        return this.update({"_id": walletID}, {amount: wallet.amount + amount}, session);
    }
    
    async decreaseWallet(walletID, amount: number, session = null): Promise<WalletDocument> {
        let wallet = await this.findOneByField({"_id": walletID});
        if(wallet.amount < amount) return null;
        return this.update({"_id": walletID}, {amount: wallet.amount - amount}, session);
    }
}
