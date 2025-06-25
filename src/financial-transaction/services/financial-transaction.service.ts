import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common"
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import mongoose, { Model, ClientSession } from "mongoose";
import { ApplicationService } from "src/application/services";
import { WalletService } from "src/wallet/services";
import { CreateFinancialTransactionDTO } from "../dtos";
import { FinancialTransaction, FinancialTransactionDocument } from "../models";
import { ConfigService } from "@nestjs/config";
import { DataBaseService } from "src/shared/database";
import { TransactionHistoryFilterDTO } from "../dtos/transaction-history-filter.dto";
import { TransactionExportOptions } from "../interfaces/transaction-export.interface";
import { StatsExportOptionsDTO, StatsExportFormat } from "../dtos/stats-export-options.dto";
import { PdfGenerator } from "../utils/pdf-generator";
import * as path from 'path';

@Injectable()
export class FinancialTransactionService extends DataBaseService<FinancialTransactionDocument>
{
    constructor(
        @InjectModel(FinancialTransaction.name)  private financialTransactionModel:Model<FinancialTransactionDocument>,
        @InjectConnection() connection:mongoose.Connection,
        private applicationService:ApplicationService,
        private walletService:WalletService,
        private configService:ConfigService
    ){
        super(financialTransactionModel,connection,[])
    }

    async createNewFinancialTransaction(createFinancialTransactionDTO:CreateFinancialTransactionDTO,session)
    {
        let apps = await this.applicationService.findOneByField({_id:createFinancialTransactionDTO.appID})
        if(!apps) throw new NotFoundException({
             status:HttpStatus.NOT_FOUND,
             errors:["transaction/app-notfound"],
            message:`APP id ${createFinancialTransactionDTO.appID} not found`
        })
        createFinancialTransactionDTO.application= apps
        createFinancialTransactionDTO.wallet=await this.walletService.findOneByField({application:apps._id});

        return this.create(createFinancialTransactionDTO,session)     
    }

    async findOne(filter: any): Promise<FinancialTransaction> {
        return this.financialTransactionModel.findOne(filter).exec();
    }

    /**
     * Récupère l'historique des transactions avec filtrage
     * @param filter Filtres pour l'historique des transactions
     * @returns Liste des transactions correspondant aux critères
     */
    async getTransactionHistory(filter: TransactionHistoryFilterDTO): Promise<FinancialTransactionDocument[]> {
        // Vérifier si l'application existe
        const app = await this.applicationService.findOneByField({_id: filter.appID});
        if (!app) {
            throw new NotFoundException({
                status: HttpStatus.NOT_FOUND,
                errors: ["transaction/app-notfound"],
                message: `Application with ID ${filter.appID} not found`
            });
        }

        // Construire le filtre de requête
        const queryFilter: any = { application: new mongoose.Types.ObjectId(filter.appID) };

        // Ajouter les filtres optionnels s'ils sont fournis
        if (filter.state) {
            queryFilter.state = filter.state;
        }

        if (filter.type) {
            queryFilter.type = filter.type;
        }

        if (filter.paymentMode) {
            queryFilter.paymentMode = filter.paymentMode;
        }

        if (filter.ref) {
            queryFilter.ref = filter.ref;
        }

        // Filtrer par période
        if (filter.startDate || filter.endDate) {
            queryFilter.createdAt = {};
            
            if (filter.startDate) {
                queryFilter.createdAt.$gte = new Date(filter.startDate);
            }
            
            if (filter.endDate) {
                queryFilter.createdAt.$lte = new Date(filter.endDate);
            }
        }

        // Exécuter la requête
        return this.financialTransactionModel
            .find(queryFilter)
            .sort({ createdAt: -1 }) // Tri par date décroissante (plus récent d'abord)
            .exec();
    }

    /**
     * Récupère les statistiques des transactions pour une application
     * @param appID ID de l'application
     * @param startDate Date de début (optionnelle)
     * @param endDate Date de fin (optionnelle)
     * @returns Statistiques des transactions
     */
    async getTransactionStats(appID: string, startDate?: string, endDate?: string): Promise<any> {
        // Vérifier si l'application existe
        const app = await this.applicationService.findOneByField({_id: appID});
        if (!app) {
            throw new NotFoundException({
                status: HttpStatus.NOT_FOUND,
                errors: ["transaction/app-notfound"],
                message: `Application with ID ${appID} not found`
            });
        }

        // Construire le filtre de base
        const matchStage: any = { application: new mongoose.Types.ObjectId(appID) };
        
        // Ajouter le filtre de période si fourni
        if (startDate || endDate) {
            matchStage.createdAt = {};
            
            if (startDate) {
                matchStage.createdAt.$gte = new Date(startDate);
            }
            
            if (endDate) {
                matchStage.createdAt.$lte = new Date(endDate);
            }
        }

        // Exécuter l'agrégation pour obtenir les statistiques
        const stats = await this.financialTransactionModel.aggregate([
            { $match: matchStage },
            { 
                $group: {
                    _id: null,
                    totalTransactions: { $sum: 1 },
                    totalAmount: { $sum: "$amount" },
                    successfulTransactions: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$state", "financial_transaction_success"] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    pendingTransactions: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$state", "financial_transaction_pending"] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    failedTransactions: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$state", "financial_transaction_error"] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    deposits: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$type", "deposit"] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    withdrawals: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$type", "withdraw"] }, 
                                1, 
                                0
                            ] 
                        } 
                    },
                    depositAmount: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$type", "deposit"] }, 
                                "$amount", 
                                0
                            ] 
                        } 
                    },
                    withdrawalAmount: { 
                        $sum: { 
                            $cond: [
                                { $eq: ["$type", "withdraw"] }, 
                                "$amount", 
                                0
                            ] 
                        } 
                    }
                } 
            },
            {
                $project: {
                    _id: 0,
                    totalTransactions: 1,
                    totalAmount: 1,
                    successRate: { 
                        $cond: [
                            { $eq: ["$totalTransactions", 0] },
                            0,
                            { $multiply: [{ $divide: ["$successfulTransactions", "$totalTransactions"] }, 100] }
                        ]
                    },
                    successfulTransactions: 1,
                    pendingTransactions: 1,
                    failedTransactions: 1,
                    deposits: 1,
                    withdrawals: 1,
                    depositAmount: 1,
                    withdrawalAmount: 1
                }
            }
        ]);

        // Si aucune transaction n'est trouvée, retourner des statistiques vides
        if (stats.length === 0) {
            return {
                totalTransactions: 0,
                totalAmount: 0,
                successRate: 0,
                successfulTransactions: 0,
                pendingTransactions: 0,
                failedTransactions: 0,
                deposits: 0,
                withdrawals: 0,
                depositAmount: 0,
                withdrawalAmount: 0
            };
        }

        return stats[0];
    }

    /**
     * Prépare les données pour l'exportation des transactions
     * @param options Options d'exportation
     * @returns Données formatées pour l'exportation
     */
    async prepareTransactionExport(options: TransactionExportOptions): Promise<any> {
        // Récupérer les transactions selon les critères
        const filter: TransactionHistoryFilterDTO = {
            appID: options.appID
        };
        
        if (options.startDate) {
            filter.startDate = options.startDate;
        }
        
        if (options.endDate) {
            filter.endDate = options.endDate;
        }
        
        const transactions = await this.getTransactionHistory(filter);
        
        // Formater les données pour l'exportation
        const exportData = transactions.map(transaction => {
            return {
                'Référence': transaction.ref,
                'Date': new Date(transaction.createdAt).toLocaleString(),
                'Type': this.translateTransactionType(transaction.type),
                'Montant': `${transaction.amount} ${transaction.moneyCode}`,
                'Mode de paiement': transaction.paymentMode,
                'Statut': this.translateTransactionState(transaction.state),
                'Description': transaction.raison || '-',
                'Numéro': transaction.phoneNumber || '-'
            };
        });
        
        return exportData;
    }

    /**
     * Traduit le type de transaction en français pour l'affichage
     */
    private translateTransactionType(type: string): string {
        const typeMap = {
            'deposit': 'Dépôt',
            'withdraw': 'Retrait'
        };
        
        return typeMap[type] || type;
    }

    /**
     * Traduit l'état de transaction en français pour l'affichage
     */
    private translateTransactionState(state: string): string {
        const stateMap = {
            'financial_transaction_start': 'Initiée',
            'financial_transaction_pending': 'En attente',
            'financial_transaction_error': 'Échouée',
            'financial_transaction_success': 'Réussie',
            'financial_transaction_cancel': 'Annulée'
        };
        
        return stateMap[state] || state;
    }

    /**
     * Génère un rapport de statistiques financières au format PDF
     * @param options Options d'exportation des statistiques
     * @returns Chemin du fichier généré ou données formatées
     */
    async generateStatisticsReport(options: StatsExportOptionsDTO): Promise<any> {
        // Récupérer les statistiques
        const stats = await this.getTransactionStats(options.appID, options.startDate, options.endDate);
        
        // Si le format demandé est PDF
        if (options.format === StatsExportFormat.PDF) {
            try {
                const pdfPath = await PdfGenerator.generateStatsPdf(stats, options);
                
                return {
                    format: options.format,
                    fileName: path.basename(pdfPath),
                    filePath: pdfPath,
                    generatedAt: new Date().toISOString()
                };
            } catch (error) {
                console.error('Erreur lors de la génération du PDF:', error);
                throw new Error('Erreur lors de la génération du PDF');
            }
        }
        
        // Pour les autres formats, retourner simplement les données formatées
        return {
            format: options.format,
            fileName: options.fileName || `financial_stats_${new Date().getTime()}`,
            data: stats,
            generatedAt: new Date().toISOString()
        };
    }

    /**
     * Récupère toutes les transactions sans filtrer sur isDeleted
     * @param filter Filtres optionnels
     * @returns Liste des transactions
     */
    async getAllTransactions(filter: Record<string, any> = {}): Promise<FinancialTransactionDocument[]> {
        console.log('Récupération de toutes les transactions avec filtre:', filter);
        try {
            // Utiliser directement le modèle Mongoose au lieu de passer par findByField
            const query = this.financialTransactionModel.find(filter);
            
            const results = await query.exec();
            console.log(`${results.length} transactions trouvées`);
            return results;
        } catch (error) {
            console.error('Erreur lors de la récupération des transactions:', error);
            throw error;
        }
    }

    async findByField(entityObj: Record<string, any>, session?: ClientSession, options?: { allowDiskUse?: boolean }): Promise<FinancialTransactionDocument[]> {
        // Créer la requête de base
        const query = this.financialTransactionModel.find(entityObj);
        
        // Ajouter l'option allowDiskUse si elle est fournie
        if (options?.allowDiskUse) {
            query.allowDiskUse(true);
        }
        
        // Exécuter la requête avec la session si fournie
        if (session) {
            return await query.session(session).exec();
        }
        
        return await query.exec();
    }
}
