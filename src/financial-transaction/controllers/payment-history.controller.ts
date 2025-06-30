import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Public } from 'nest-keycloak-connect';
import { FinancialTransactionService } from '../services';
import mongoose from 'mongoose';
import { ObjectIDValidationPipe } from 'src/shared/pipes/objectID.pipe';

@ApiTags('Payment History')
@Controller('payment-history')
export class PaymentHistoryController {
  constructor(
    private readonly financialTransactionService: FinancialTransactionService
  ) {}

  @Get(':appID')
  @ApiOperation({ summary: 'Get all transactions for an application' })
  @ApiParam({ name: 'appID', description: 'Application ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'status', required: false, description: 'Transaction status' })
  @ApiQuery({ name: 'paymentMode', required: false, description: 'Payment mode (MTN, ORANGE, etc.)' })
  @Public()
  async getTransactionsByAppId(
    @Param('appID', ObjectIDValidationPipe) appID: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('paymentMode') paymentMode?: string
  ) {
    try {
      console.log(`Récupération des transactions pour l'application: ${appID}`);
      
      // Construire le filtre avec l'ID de l'application
      const filter: any = { 
        application: new mongoose.Types.ObjectId(appID)
      };
      
      if (startDate && endDate) {
        filter.createdAt = {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        };
      } else if (startDate) {
        filter.createdAt = { $gte: new Date(startDate) };
      } else if (endDate) {
        filter.createdAt = { $lte: new Date(endDate) };
      }
      
      if (status) {
        filter.state = status;
      }
      
      if (paymentMode) {
        filter.paymentMode = paymentMode;
      }
      
      console.log('Filtre de recherche:', JSON.stringify(filter, null, 2));
      
      // Utiliser findManyDocuments pour obtenir un tableau de transactions
      const transactions = await this.financialTransactionService.findManyDocuments(filter);
      
      console.log(`${transactions.length} transactions trouvées`);
      
      return {
        success: true,
        count: transactions.length,
        data: transactions
      };
    } catch (error) {
      console.error('Erreur lors de la récupération des transactions:', error);
      return {
        success: false,
        message: 'Failed to retrieve transactions',
        error: error.message
      };
    }
  }

  @Get('transaction/:transactionId/app/:appID')
  @ApiOperation({ summary: 'Get a specific transaction for an application' })
  @ApiParam({ name: 'appID', description: 'Application ID' })
  @ApiParam({ name: 'transactionId', description: 'Transaction ID' })
  @Public()
  async getSpecificTransaction(
    @Param('appID', ObjectIDValidationPipe) appID: string,
    @Param('transactionId', ObjectIDValidationPipe) transactionId: string
  ) {
    try {
      console.log(`Récupération de la transaction ${transactionId} pour l'application ${appID}`);
      
      const transaction = await this.financialTransactionService.findOneDocument({ 
        _id: transactionId,
        application: new mongoose.Types.ObjectId(appID)
      });
      
      if (!transaction) {
        return {
          success: false,
          message: `Transaction with ID ${transactionId} not found for application ${appID}`
        };
      }
      
      return {
        success: true,
        data: transaction
      };
    } catch (error) {
      console.error('Erreur lors de la récupération de la transaction:', error);
      return {
        success: false,
        message: 'Failed to retrieve transaction',
        error: error.message
      };
    }
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all transactions with filters (legacy endpoint)' })
  @ApiQuery({ name: 'appID', required: true, description: 'Application ID' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (ISO format)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (ISO format)' })
  @ApiQuery({ name: 'status', required: false, description: 'Transaction status' })
  @ApiQuery({ name: 'paymentMode', required: false, description: 'Payment mode (MTN, ORANGE, etc.)' })
  @Public()
  async getAllTransactions(
    @Query('appID') appID: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('status') status?: string,
    @Query('paymentMode') paymentMode?: string
  ) {
    return this.getTransactionsByAppId(appID, startDate, endDate, status, paymentMode);
  }
}