import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Wallet, WalletDocument } from "../models/wallet.schema";
import { Connection, Model, ObjectId } from "mongoose";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import mongoose from "mongoose";

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
        try {
            console.log('Récupération des montants pour les applications:', applicationIds);
            
            // Vérifier si la liste est vide
            if (!applicationIds || applicationIds.length === 0) {
                console.log('Liste d\'IDs d\'applications vide, retour d\'une Map vide');
                return new Map<string, number>();
            }
            
            // Utiliser directement le modèle Mongoose pour éviter les problèmes avec findAll
            const wallets = await this.walletModel.find({ 
                application: { $in: applicationIds } 
            }).exec();
            
            console.log(`${wallets.length} portefeuilles trouvés pour ${applicationIds.length} applications`);
            
            // Créer une Map des montants par ID d'application
            const amountsMap = new Map<string, number>();
            
            wallets.forEach(wallet => {
                const appIdStr = wallet.application.toString();
                amountsMap.set(appIdStr, wallet.amount || 0);
                console.log(`Application ${appIdStr}: montant = ${wallet.amount || 0}`);
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
