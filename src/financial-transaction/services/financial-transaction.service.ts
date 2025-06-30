    import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common"
    import { InjectConnection, InjectModel } from "@nestjs/mongoose";
    import mongoose, { Model, ClientSession } from "mongoose";
    import { ApplicationService } from "src/application/services";
    import { WalletService } from "src/wallet/services";
    import { CreateFinancialTransactionDTO } from "../dtos";
    import { FinancialTransaction, FinancialTransactionDocument } from "../models";
    import { ConfigService } from "@nestjs/config";
    import { DataBaseService } from "src/shared/database";

    @Injectable()
    export class FinancialTransactionService extends DataBaseService<FinancialTransactionDocument>
    {
        constructor(
            @InjectModel(FinancialTransaction.name) private financialTransactionModel: Model<FinancialTransactionDocument>,
            @InjectConnection() connection: mongoose.Connection,
            private applicationService: ApplicationService,
            private walletService: WalletService,
            private configService: ConfigService
        ){
            super(financialTransactionModel, connection, [])
        }

        async createNewFinancialTransaction(createFinancialTransactionDTO: CreateFinancialTransactionDTO, session) {
            let apps = await this.applicationService.findOneByField({_id: createFinancialTransactionDTO.appID})
            if(!apps) throw new NotFoundException({
                status: HttpStatus.NOT_FOUND,
                errors: ["transaction/app-notfound"],
                message: `APP id ${createFinancialTransactionDTO.appID} not found`
            })
            createFinancialTransactionDTO.application = apps
            createFinancialTransactionDTO.wallet = await this.walletService.findOneByField({application: apps._id});

            return this.create(createFinancialTransactionDTO, session)     
        }

        // Implémentation compatible avec la classe parente - retourne toujours un tableau
        async findByField(entityObj: Record<string, any>, session?: ClientSession, options?: { allowDiskUse?: boolean }): Promise<FinancialTransactionDocument[]> {
            if (session) {
                return this.financialTransactionModel.find(entityObj).session(session).setOptions(options || {}).exec();
            } else {
                return this.financialTransactionModel.find(entityObj).setOptions(options || {}).exec();
            }
        }
        
        // Méthode spécifique pour trouver un seul document
        async findOneDocument(filter: any): Promise<FinancialTransactionDocument> {
            return this.financialTransactionModel.findOne(filter).exec();
        }
        
        // Méthode spécifique pour trouver plusieurs documents
        async findManyDocuments(filter: any, options?: { allowDiskUse?: boolean }): Promise<FinancialTransactionDocument[]> {
            return this.financialTransactionModel.find(filter).setOptions(options || {}).exec();
        }
        
        /**
         * Récupère toutes les transactions sans filtrer sur isDeleted
         * @param filter Filtres optionnels
         * @returns Liste des transactions
         */
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
    }
