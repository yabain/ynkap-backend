import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Wallet, WalletDocument } from "../models/wallet.schema";
import { Connection, Model, ObjectId } from "mongoose";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import mongoose from "mongoose";
import { ClientSession } from "mongoose";

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
        const wallets = await this.walletModel.find({ application: {$in: applicationIds} })
        if(!wallets)
            throw new NotFoundException(`No wallet matches the specified ids`)
        
        const amountMap = new Map<string, number>()
        
        wallets.forEach(wallet => {
            amountMap.set(wallet.application.toString(), wallet.amount)
        })

        return amountMap;
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

    /**
     * Met à jour le montant d'un portefeuille pour une application spécifique
     * @param appID ID de l'application
     * @param amount Nouveau montant du portefeuille
     * @returns Le portefeuille mis à jour
     */
    async updateWalletAmount(appID: string, amount: number): Promise<WalletDocument> {
        console.log(`Mise à jour du portefeuille pour l'application ${appID} avec le montant ${amount}`);
        
        if (amount < 0) {
            throw new BadRequestException("Le montant du portefeuille ne peut pas être négatif");
        }
        
        // Convertir l'ID en ObjectId si nécessaire
        const applicationId = typeof appID === 'string' 
            ? new mongoose.Types.ObjectId(appID) 
            : appID;
        
        // Rechercher le portefeuille existant
        const wallet = await this.walletModel.findOne({ application: applicationId });
        
        if (!wallet) {
            throw new NotFoundException(`Aucun portefeuille trouvé pour l'application ${appID}`);
        }
        
        // Mettre à jour le montant
        wallet.amount = amount;
        const updatedWallet = await wallet.save();
        
        console.log(`Portefeuille mis à jour avec succès:`, updatedWallet);
        return updatedWallet;
    }

    /**
     * Crée ou met à jour un portefeuille pour une application spécifique
     * @param appID ID de l'application
     * @param amount Montant initial du portefeuille (défaut: 0)
     * @returns Le portefeuille créé ou mis à jour
     */
    async createOrUpdateWallet(appID: string, amount: number = 0): Promise<WalletDocument> {
        console.log(`Création/mise à jour du portefeuille pour l'application ${appID} avec le montant ${amount}`);
        
        if (amount < 0) {
            throw new BadRequestException("Le montant du portefeuille ne peut pas être négatif");
        }
        
        // Convertir l'ID en ObjectId si nécessaire
        const applicationId = typeof appID === 'string' 
            ? new mongoose.Types.ObjectId(appID) 
            : appID;
        
        // Rechercher un portefeuille existant
        let wallet = await this.walletModel.findOne({ application: applicationId });
        
        if (wallet) {
            console.log(`Portefeuille existant trouvé pour l'application ${appID}, mise à jour...`);
            wallet.amount = amount;
            return await wallet.save();
        } else {
            console.log(`Aucun portefeuille trouvé pour l'application ${appID}, création d'un nouveau...`);
            // Créer un nouveau portefeuille
            const newWallet = new this.walletModel({
                application: applicationId,
                amount: amount
            });
            
            return await newWallet.save();
        }
    }

    /**
     * Supprime un portefeuille s'il n'a pas de fonds
     * @param filter Filtre pour trouver le portefeuille à supprimer
     * @param session Session de transaction optionnelle
     * @returns Résultat de la suppression
     */
    async delete(filter: any, session?: ClientSession): Promise<any> {
        // Vérifier si le portefeuille a des fonds
        const wallet = await this.findOneByField(filter);
        
        if (wallet && wallet.amount > 0) {
            throw new BadRequestException(`Cannot delete wallet with funds. Please transfer all funds first.`);
        }
        
        // Utiliser la méthode delete héritée de DataBaseService
        return super.delete(filter, session);
    }

    /**
     * Ajoute un montant au portefeuille existant
     * @param appID ID de l'application
     * @param amount Montant à ajouter au portefeuille
     * @returns Le portefeuille mis à jour
     */
    async addToWalletAmount(appID: string, amount: number): Promise<WalletDocument> {
        console.log(`Ajout de ${amount} au portefeuille pour l'application ${appID}`);
        
        if (amount < 0) {
            throw new BadRequestException("Le montant à ajouter ne peut pas être négatif");
        }
        
        // Convertir l'ID en ObjectId si nécessaire
        const applicationId = typeof appID === 'string' 
            ? new mongoose.Types.ObjectId(appID) 
            : appID;
        
        // Rechercher le portefeuille existant
        const wallet = await this.walletModel.findOne({ application: applicationId });
        
        if (!wallet) {
            throw new NotFoundException(`Aucun portefeuille trouvé pour l'application ${appID}`);
        }
        
        // Ajouter le montant au lieu de remplacer
        wallet.amount = wallet.amount + amount;
        const updatedWallet = await wallet.save();
        
        console.log(`Portefeuille mis à jour avec succès: ${updatedWallet.amount}`);
        return updatedWallet;
    }
}
