import { BadRequestException, HttpStatus, Injectable, NotFoundException, Inject, forwardRef, Logger } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, ClientSession } from 'mongoose';
import mongoose from 'mongoose';
import { Wallet, WalletDocument } from '../models/wallet.schema';
import { DataBaseService } from 'src/shared/database';
import { ApplicationService } from 'src/application/services';

@Injectable()
export class WalletService extends DataBaseService<WalletDocument> {
    private readonly logger = new Logger(WalletService.name);

    constructor(
        @InjectModel(Wallet.name) private walletModel: Model<WalletDocument>,
        @InjectConnection() connection: Connection,
        @Inject(forwardRef(() => ApplicationService)) private applicationService: ApplicationService
    ) {
        super(walletModel, connection, []);
    }

    // Méthode pour créer un nouveau portefeuille
    async create(createWalletDto: any, session?: ClientSession): Promise<WalletDocument> {
        this.logger.log(`Creating new wallet for application: ${createWalletDto.application}`);
        try {
        const newWallet = new this.walletModel({
            ...createWalletDto,
            amount: 0 // Montant initial à 0
        });
        
        return session ? await newWallet.save({ session }) : await newWallet.save();
        } catch (error) {
        this.logger.error(`Error creating wallet: ${error.message}`);
        throw error;
        }
    }

    // Méthode pour trouver un portefeuille par un champ spécifique
    async findOneByField(filter: any): Promise<WalletDocument> {
        this.logger.log(`Finding wallet with filter: ${JSON.stringify(filter)}`);
        try {
        const wallet = await this.walletModel.findOne(filter).exec();
        this.logger.log(`Wallet found: ${wallet ? 'Yes' : 'No'}`);
        return wallet;
        } catch (error) {
        this.logger.error(`Error finding wallet: ${error.message}`);
        throw error;
        }
    }

    // Méthode pour supprimer un portefeuille
    async delete(filter: any, session?: ClientSession): Promise<any> {
        this.logger.log(`Deleting wallet with filter: ${JSON.stringify(filter)}`);
        try {
        const wallet = await this.findOneByField(filter);
        if (wallet && wallet.amount > 0) {
            this.logger.warn(`Cannot delete wallet with funds: ${wallet.amount}`);
            throw new BadRequestException("Cannot delete wallet with remaining funds");
        }
        
        const result = session 
            ? await this.walletModel.deleteOne(filter).session(session)
            : await this.walletModel.deleteOne(filter);
        
        this.logger.log(`Wallet deletion result: ${JSON.stringify(result)}`);
        return result;
        } catch (error) {
        this.logger.error(`Error deleting wallet: ${error.message}`);
        throw error;
        }
    }

    async findById(id: string): Promise<WalletDocument> {
        this.logger.log(`Finding wallet with ID: ${id}`);
        try {
        const objectId = typeof id === 'string' 
            ? new mongoose.Types.ObjectId(id) 
            : id;
        
        const wallet = await this.walletModel.findById(objectId).exec();
        this.logger.log(`Wallet found: ${wallet ? 'Yes' : 'No'}`);
        return wallet;
        } catch (error) {
        this.logger.error(`Error finding wallet with ID ${id}: ${error.message}`);
        throw error;
        }
    }

    async getAmount(id: string): Promise<number> {
        this.logger.log(`Getting amount for application ID: ${id}`);
        try {
        const applicationId = typeof id === 'string' 
            ? new mongoose.Types.ObjectId(id) 
            : id;
        
        const wallet = await this.walletModel.findOne({ application: applicationId }).exec();
        if (!wallet) {
            this.logger.warn(`No wallet found for application ID: ${id}`);
            return 0;
        }
        
        this.logger.log(`Wallet amount for application ${id}: ${wallet.amount}`);
        return wallet.amount || 0;
        } catch (error) {
        this.logger.error(`Error getting wallet amount for ID ${id}: ${error.message}`);
        throw error;
        }
    }

    async getAmounts(applicationIds: string[]): Promise<Map<string, number>> {
        this.logger.log(`Getting amounts for applications: ${applicationIds}`);
        try {
        if (!applicationIds || applicationIds.length === 0) {
            this.logger.log('Empty application IDs list, returning empty Map');
            return new Map();
        }
        
        const objectIds = applicationIds.map(id => 
            typeof id === 'string' ? new mongoose.Types.ObjectId(id) : id
        );
        
        const wallets = await this.walletModel.find({ 
            application: { $in: objectIds } 
        }).exec();
        
        this.logger.log(`Found ${wallets.length} wallets for ${applicationIds.length} applications`);
        
        const amountMap = new Map<string, number>();
        
        for (const wallet of wallets) {
            const appIdStr = wallet.application.toString();
            this.logger.debug(`Application ${appIdStr}: amount = ${wallet.amount || 0}`);
            amountMap.set(appIdStr, wallet.amount || 0);
        }
        
        for (const appId of applicationIds) {
            if (!amountMap.has(appId)) {
            this.logger.debug(`No wallet found for application ${appId}, setting amount to 0`);
            amountMap.set(appId, 0);
            }
        }
        
        return amountMap;
        } catch (error) {
        this.logger.error(`Error in getAmounts: ${error.message}`);
        throw error;
        }
    }

    async increaseWallet(walletId: string, amount: number, session = null) {
        const wallet = await this.findOneByField({ _id: walletId });
        if (!wallet) {
        throw new NotFoundException({
            status: HttpStatus.NOT_FOUND,
            errors: ["wallet/not-found"],
            message: `Wallet with ID ${walletId} not found`
        });
        }

        wallet.amount += amount;
        return wallet.save({ session });
    }

    async decreaseWallet(walletId: string, amount: number, session = null) {
        const wallet = await this.findOneByField({ _id: walletId });
        if (!wallet) {
        throw new NotFoundException({
            status: HttpStatus.NOT_FOUND,
            errors: ["wallet/not-found"],
            message: `Wallet with ID ${walletId} not found`
        });
        }

        if (wallet.amount < amount) {
        throw new BadRequestException({
            status: HttpStatus.BAD_REQUEST,
            errors: ["wallet/insufficient-funds"],
            message: `Insufficient funds in wallet with ID ${walletId}`
        });
        }

        wallet.amount -= amount;
        return wallet.save({ session });
    }

    /**
     * Met à jour le montant d'un portefeuille pour une application spécifique
     * @param appID ID de l'application
     * @param amount Montant à ajouter au portefeuille (peut être négatif pour soustraire)
     * @returns Le portefeuille mis à jour
     */
    async updateWalletAmount(appID: string, amount: number): Promise<WalletDocument> {
        this.logger.log(`Updating wallet for application ${appID} with amount ${amount}`);
        
        const applicationId = typeof appID === 'string' 
        ? new mongoose.Types.ObjectId(appID) 
        : appID;

        const updatedWallet = await this.walletModel.findOneAndUpdate(
        { application: applicationId },
        { $inc: { amount: amount } },
        { new: true, upsert: false }
        ).exec();

        if (!updatedWallet) {
        throw new NotFoundException(`Portefeuille non trouvé pour l'application ${appID}`);
        }

        // Vérifier que le montant ne devient pas négatif
        if (updatedWallet.amount < 0) {
        // Annuler l'opération
        await this.walletModel.findOneAndUpdate(
            { application: applicationId },
            { $inc: { amount: -amount } },
            { new: true }
        ).exec();
        throw new BadRequestException("Fonds insuffisants dans le portefeuille");
        }

        this.logger.log(`Wallet updated successfully for application ${appID}`);
        return updatedWallet;
    }

    /**
     * Crée ou met à jour un portefeuille pour une application spécifique
     * @param appID ID de l'application
     * @param amount Montant initial du portefeuille (défaut: 0)
     * @returns Le portefeuille créé ou mis à jour
     */
    async createOrUpdateWallet(appID: string, amount: number = 0): Promise<WalletDocument> {
        this.logger.log(`Creating/updating wallet for application ${appID} with amount ${amount}`);
        
        if (amount < 0) {
        throw new BadRequestException("Le montant du portefeuille ne peut pas être négatif");
        }
        
        const applicationId = typeof appID === 'string' 
        ? new mongoose.Types.ObjectId(appID) 
        : appID;

        let wallet = await this.walletModel.findOne({ application: applicationId }).exec();
        
        if (wallet) {
        this.logger.log(`Existing wallet found for application ${appID}, updating...`);
        wallet.amount = amount;
        return await wallet.save();
        } else {
        this.logger.log(`No wallet found for application ${appID}, creating new...`);
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
    async addToWallet(appID: string, amount: number): Promise<WalletDocument> {
        this.logger.log(`Adding ${amount} to wallet for application ${appID}`);
        
        if (amount <= 0) {
        throw new BadRequestException("Le montant à ajouter doit être positif");
        }
        
        const applicationId = typeof appID === 'string' 
        ? new mongoose.Types.ObjectId(appID) 
        : appID;

        const updatedWallet = await this.walletModel.findOneAndUpdate(
        { application: applicationId },
        { $inc: { amount: amount } },
        { new: true, upsert: true }
        ).exec();

        this.logger.log(`Wallet updated successfully: ${updatedWallet.amount}`);
        return updatedWallet;
    }

    /**
     * Retire un montant du portefeuille
     * @param appID ID de l'application
     * @param amount Montant à retirer
     * @returns Le portefeuille mis à jour
     */
    async withdrawFromWallet(appID: string, amount: number): Promise<WalletDocument> {
        this.logger.log(`Withdrawing ${amount} from wallet for application ${appID}`);
        
        if (amount <= 0) {
            throw new BadRequestException("Le montant à retirer doit être positif");
        }
        
        const applicationId = typeof appID === 'string' 
            ? new mongoose.Types.ObjectId(appID) 
            : appID;

        const wallet = await this.walletModel.findOne({ application: applicationId }).exec();
        
        if (!wallet) {
            throw new NotFoundException(`Aucun portefeuille trouvé pour l'application ${appID}`);
        }
        
        if (wallet.amount < amount) {
            throw new BadRequestException(`Solde insuffisant. Solde actuel: ${wallet.amount}, montant demandé: ${amount}`);
        }
        
        wallet.amount = wallet.amount - amount;
        const updatedWallet = await wallet.save();
        
        this.logger.log(`Withdrawal successful. New balance: ${updatedWallet.amount}`);
        return updatedWallet;
    }
    }
