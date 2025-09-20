import { HttpStatus, Injectable, NotFoundException, Inject, forwardRef } from "@nestjs/common"
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { ApplicationService } from "src/application/services";
import { CreateFinancialTransactionDTO } from "../dtos";
import { FinancialTransaction, FinancialTransactionDocument } from "../models";
import { ConfigService } from "@nestjs/config";
import { DataBaseService } from "src/shared/database";
import { WalletService } from "src/wallet/services/wallet.service";

@Injectable()
export class FinancialTransactionService extends DataBaseService<FinancialTransactionDocument>
{
    constructor(
        @InjectModel(FinancialTransaction.name) private financialTransactionModel: Model<FinancialTransactionDocument>,
        @InjectConnection() connection: mongoose.Connection,
        @Inject(forwardRef(() => ApplicationService)) private applicationService: ApplicationService,
        @Inject(forwardRef(() => WalletService)) private walletService: WalletService,
        private configService: ConfigService
    ){
        super(financialTransactionModel, connection, [])
    }

    // Ajouter les méthodes manquantes
    async findOneDocument(filter: any): Promise<FinancialTransactionDocument> {
        return this.findOneByField(filter);
    }

    async findManyDocuments(filter: any): Promise<FinancialTransactionDocument[]> {
        return this.findByField(filter);
    }

    async createNewFinancialTransaction(createFinancialTransactionDTO: CreateFinancialTransactionDTO, session) {
        let apps = await this.applicationService.findOneByField({_id: createFinancialTransactionDTO.appID})
        if(!apps) throw new NotFoundException({
            status: HttpStatus.NOT_FOUND,
            errors: ["transaction/app-notfound"],
            message: `APP id ${createFinancialTransactionDTO.appID} not found`
        })
        createFinancialTransactionDTO.application = apps
        
        const wallet = await this.walletService.findOneByField({application: apps._id});
        if (!wallet) {
            throw new NotFoundException({
                status: HttpStatus.NOT_FOUND,
                errors: ["transaction/wallet-notfound"],
                message: `Wallet for APP id ${createFinancialTransactionDTO.appID} not found`
            });
        }
        
        createFinancialTransactionDTO.wallet = wallet;
        return this.create(createFinancialTransactionDTO, session)     
    }

    async getAllTransactions(filter: Record<string, any> = {}, limit: number = 100): Promise<FinancialTransactionDocument[]> {
        console.log('Récupération de toutes les transactions avec filtre:', filter, 'limite:', limit);
        try {
            const query = this.financialTransactionModel.find(filter)
                .sort({ createdAt: -1 });
            
            if (limit > 0) {
                query.limit(limit);
            }
            
            const results = await query.exec();
            console.log(`${results.length} transactions trouvées`);
            return results;
        } catch (error) {
            console.error('Erreur lors de la récupération des transactions:', error);
            throw error;
        }
    }

    async create(createFinancialTransactionDTO, session = null): Promise<FinancialTransactionDocument> {
        console.log('Creating financial transaction:', JSON.stringify(createFinancialTransactionDTO, null, 2));
        try {
            const newTransaction = new this.financialTransactionModel(createFinancialTransactionDTO);
            const savedTransaction = await newTransaction.save({ session });
            console.log('Transaction saved successfully with ID:', savedTransaction._id);
            return savedTransaction;
        } catch (error) {
            console.error('Error saving transaction:', error);
            throw error;
        }
    }

    async aggregate(pipeline: any[]): Promise<any[]> {
        return await this.financialTransactionModel.aggregate(pipeline).exec();
    }
}
