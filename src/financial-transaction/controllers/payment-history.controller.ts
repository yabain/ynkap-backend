import { Body, Controller, Get, HttpStatus, Param, Post, Query, Req, Res, UseInterceptors, NotFoundException, InternalServerErrorException } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from 'express';
import { Public } from "nest-keycloak-connect";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { FinancialTransactionService, PaymentService } from "../services";
import { TransactionHistoryFilterDTO } from "../dtos/transaction-history-filter.dto";
import { StatsExportOptionsDTO } from "../dtos/stats-export-options.dto";
import { TransactionExportOptions } from "../interfaces/transaction-export.interface";
import * as fs from 'fs-extra';
import * as path from 'path';
import mongoose from "mongoose";

@Public()
@UseInterceptors(TransformResponeInterceptor)
@Controller("payment-history")
@ApiTags('Transaction-History')
export class PaymentHistoryController
{
    constructor(private paymentService: PaymentService,
        private financialTransactionService: FinancialTransactionService,
    ){}

    @ApiOperation({
        summary: "Get all payment transaction history for a specific application ",
        description: "This method returns all payment transaction history for a specific application "
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiResponse({status: HttpStatus.OK, description: "Transaction-payment history details",
        example: 
        {
            "statusCode": 200,
            "message": "Opération réussie",
            "data": [
                {
                    "userRef": {
                        "fullName": "Cédric Nguendap",
                        "account": "698295368"
                    },
                    "_id": "67496c55e555b20e77d3d56a",
                    "state": "financial_transaction_pending",
                    "amount": 25,
                    "raison": "Paiement de frais de scolarité",
                    "type": "deposit",
                    "ref": "REF1732864911941",
                    "token": "MP241129DD2D67ABACD8CC4D4496",
                    "error": 0,
                    "paymentMode": "ORANGE",
                    "application": "6749689642bafee2045b382c",
                    "moneyCode": "XAF",
                    "wallet": "6749689642bafee2045b382e",
                    "createdAt": "2024-11-29T07:21:51.941Z",
                    "startDate": "2024-11-29T07:25:14.895Z",
                    "endDate": "2024-11-29T07:25:14.895Z"
                }
            ]
        }
    })
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the id passed in parameter cannot be found", 
        example: 
        {
            "statusCode": 200,
            "message": "Opération réussie",
            "data": []
        }
    })
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak",
        example:
        {
            "statusCode": 401,
            "message": "Unauthorized",
            "data": null,
            "timestamp": "2024-11-29T09:38:06.439Z"
        }
    })
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured",
        example:
        {
            "statusCode": 500,
            "message": "An internal error has occurred",
            "data": null,
            "timestamp": "2024-11-29T09:38:06.439Z"
        }
    })
    // @UseGuards(AppAuthJwtGuard)
    @Public()
    @Get(":appID")    
    async getTransactionsByAppId(@Req() request: Request, @Param("appID", ObjectIDValidationPipe) appID: string)
    {
        return await this.financialTransactionService.findByField({application: new mongoose.Types.ObjectId(appID)})  
    }

    @ApiOperation({
        summary: "Get filtered transaction history",
        description: "This method returns transaction history filtered by various criteria"
    })
    @ApiResponse({status: HttpStatus.OK, description: "Filtered transaction history"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid filter parameters"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @CustomMessage("Transaction history retrieved successfully")
    @Public()
    @Post("filter")
    async getFilteredTransactionHistory(@Body() filter: TransactionHistoryFilterDTO) {
        return await this.financialTransactionService.getTransactionHistory(filter);
    }

    @ApiOperation({
        summary: "Get transaction statistics for an application",
        description: "This method returns statistics about transactions for a specific application"
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)', example: "2024-01-01T00:00:00.000Z" })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)', example: "2024-12-31T23:59:59.999Z" })
    @ApiResponse({status: HttpStatus.OK, description: "Transaction statistics",
        example: {
            "statusCode": 200,
            "message": "Transaction statistics retrieved successfully",
            "data": {
                "totalTransactions": 10,
                "totalAmount": 5000,
                "successRate": 80,
                "successfulTransactions": 8,
                "pendingTransactions": 1,
                "failedTransactions": 1,
                "deposits": 7,
                "withdrawals": 3,
                "depositAmount": 3500,
                "withdrawalAmount": 1500
            }
        }
    })
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @CustomMessage("Transaction statistics retrieved successfully")
    @Public()
    @Get("stats/:appID")
    async getTransactionStats(
        @Param("appID", ObjectIDValidationPipe) appID: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string
    ) {
        return await this.financialTransactionService.getTransactionStats(appID, startDate, endDate);
    }

    @ApiOperation({
        summary: "Export transaction history",
        description: "This method exports transaction history in various formats"
    })
    @ApiResponse({status: HttpStatus.OK, description: "Transaction history exported successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid export parameters"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @CustomMessage("Transaction history exported successfully")
    @Public()
    @Post("export")
    async exportTransactionHistory(@Body() exportOptions: TransactionExportOptions) {
        return await this.financialTransactionService.prepareTransactionExport(exportOptions);
    }

    @ApiOperation({
        summary: "Get transaction details",
        description: "This method returns details of a specific transaction"
    })
    @ApiParam({ name: 'transactionId', description: 'ID of the transaction', example: "67496c55e555b20e77d3d56a"})
    @ApiResponse({status: HttpStatus.OK, description: "Transaction details retrieved successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Transaction not found"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @CustomMessage("Transaction details retrieved successfully")
    @Public()
    @Get("transaction/:transactionId")
    async getTransactionDetails(@Param("transactionId", ObjectIDValidationPipe) transactionId: string) {
        const transaction = await this.financialTransactionService.findOneByField({_id: transactionId});
        
        if (!transaction) {
            throw new NotFoundException({
                status: HttpStatus.NOT_FOUND,
                errors: ["transaction/not-found"],
                message: `Transaction with ID ${transactionId} not found`
            });
        }
        
        return transaction;
    }

    @ApiOperation({
        summary: "Generate statistics report",
        description: "Generate a report of financial statistics in various formats (PDF, Excel, CSV)"
    })
    @ApiResponse({status: HttpStatus.OK, description: "Statistics report generated successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid export parameters"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @CustomMessage("Statistics report generated successfully")
    @Public()
    @Post("stats/export")
    async exportStatistics(@Body() exportOptions: StatsExportOptionsDTO) {
        return await this.financialTransactionService.generateStatisticsReport(exportOptions);
    }

    @ApiOperation({
        summary: "Get advanced transaction statistics",
        description: "Get detailed statistics with trends and comparisons"
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)', example: "2024-01-01T00:00:00.000Z" })
    @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)', example: "2024-12-31T23:59:59.999Z" })
    @ApiQuery({ name: 'compareWithPrevious', required: false, description: 'Compare with previous period', example: "true" })
    @ApiResponse({status: HttpStatus.OK, description: "Advanced transaction statistics"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Application not found"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @CustomMessage("Advanced transaction statistics retrieved successfully")
    @Public()
    @Get("stats/advanced/:appID")
    async getAdvancedTransactionStats(
        @Param("appID", ObjectIDValidationPipe) appID: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('compareWithPrevious') compareWithPrevious?: string
    ) {
        const compare = compareWithPrevious === 'true';
        
        // Obtenir les statistiques pour la période demandée
        const currentStats = await this.financialTransactionService.getTransactionStats(appID, startDate, endDate);
        
        // Si la comparaison avec la période précédente est demandée
        if (compare && startDate && endDate) {
            // Calculer la durée de la période
            const start = new Date(startDate);
            const end = new Date(endDate);
            const duration = end.getTime() - start.getTime();
            
            // Calculer la période précédente
            const prevEnd = new Date(start.getTime() - 1);
            const prevStart = new Date(prevEnd.getTime() - duration);
            
            // Obtenir les statistiques pour la période précédente
            const previousStats = await this.financialTransactionService.getTransactionStats(
                appID, 
                prevStart.toISOString(), 
                prevEnd.toISOString()
            );
            
            // Calculer les variations
            const variations = {
                totalTransactions: this.calculateVariation(previousStats.totalTransactions, currentStats.totalTransactions),
                totalAmount: this.calculateVariation(previousStats.totalAmount, currentStats.totalAmount),
                successRate: this.calculateVariation(previousStats.successRate, currentStats.successRate),
                deposits: this.calculateVariation(previousStats.deposits, currentStats.deposits),
                withdrawals: this.calculateVariation(previousStats.withdrawals, currentStats.withdrawals),
                depositAmount: this.calculateVariation(previousStats.depositAmount, currentStats.depositAmount),
                withdrawalAmount: this.calculateVariation(previousStats.withdrawalAmount, currentStats.withdrawalAmount)
            };
            
            return {
                current: currentStats,
                previous: previousStats,
                variations,
                period: {
                    current: { start: startDate, end: endDate },
                    previous: { start: prevStart.toISOString(), end: prevEnd.toISOString() }
                }
            };
        }
        
        return { current: currentStats };
    }

    /**
     * Calcule la variation en pourcentage entre deux valeurs
     * @param previous Valeur précédente
     * @param current Valeur actuelle
     * @returns Variation en pourcentage
     */
    private calculateVariation(previous: number, current: number): number {
        if (previous === 0) {
            return current === 0 ? 0 : 100;
        }
        return parseFloat(((current - previous) / previous * 100).toFixed(2));
    }

    @ApiOperation({
        summary: "Download generated report",
        description: "Download a previously generated statistics report"
    })
    @ApiParam({ name: 'fileName', description: 'Name of the file to download' })
    @ApiResponse({status: HttpStatus.OK, description: "File downloaded successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "File not found"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @Public()
    @Get("stats/download/:fileName")
    async downloadReport(@Param('fileName') fileName: string, @Res() res: Response) {
        try {
            const filePath = path.join(process.cwd(), 'temp', fileName);
            
            // Vérifier si le fichier existe
            if (!fs.existsSync(filePath)) {
                throw new NotFoundException(`File ${fileName} not found`);
            }
            
            // Déterminer le type MIME en fonction de l'extension
            const ext = path.extname(fileName).toLowerCase();
            let contentType = 'application/octet-stream';
            
            if (ext === '.pdf') {
                contentType = 'application/pdf';
            } else if (ext === '.xlsx') {
                contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
            } else if (ext === '.csv') {
                contentType = 'text/csv';
            }
            
            // Configurer les en-têtes de réponse
            res.setHeader('Content-Type', contentType);
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            
            // Envoyer le fichier
            const fileStream = fs.createReadStream(filePath);
            fileStream.pipe(res);
        } catch (error) {
            if (error instanceof NotFoundException) {
                throw error;
            }
            throw new InternalServerErrorException('Error downloading file');
        }
    }

    @ApiOperation({
        summary: "Récupérer toutes les transactions",
        description: "Récupère toutes les transactions avec possibilité de filtrage"
    })
    @ApiQuery({ name: 'startDate', required: false, description: 'Date de début (ISO format)', example: "2024-01-01T00:00:00.000Z" })
    @ApiQuery({ name: 'endDate', required: false, description: 'Date de fin (ISO format)', example: "2024-12-31T23:59:59.999Z" })
    @ApiQuery({ name: 'status', required: false, description: 'Statut de la transaction', example: "financial_transaction_success" })
    @ApiQuery({ name: 'paymentMode', required: false, description: 'Mode de paiement', example: "MTN" })
    @ApiResponse({status: HttpStatus.OK, description: "Liste des transactions"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "Une erreur inattendue s'est produite"})
    @CustomMessage("Transactions récupérées avec succès")
    @Public()
    @Get("all")
    async getAllTransactions(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('status') status?: string,
        @Query('paymentMode') paymentMode?: string
    ) {
        try {
            // Construire le filtre
            const filter: any = {};
            
            // Ajouter les filtres de date si fournis
            if (startDate || endDate) {
                filter.createdAt = {};
                if (startDate) filter.createdAt.$gte = new Date(startDate);
                if (endDate) filter.createdAt.$lte = new Date(endDate);
            }
            
            // Ajouter le filtre de statut si fourni
            if (status) filter.state = status;
            
            // Ajouter le filtre de mode de paiement si fourni
            if (paymentMode) filter.paymentMode = paymentMode;
            
            // Récupérer les transactions
            const transactions = await this.financialTransactionService.findByField(filter);
            
            return transactions;
        } catch (error) {
            throw new InternalServerErrorException({
                status: HttpStatus.INTERNAL_SERVER_ERROR,
                errors: ["transaction/fetch-error"],
                message: "Erreur lors de la récupération des transactions"
            });
        }
    }
}
