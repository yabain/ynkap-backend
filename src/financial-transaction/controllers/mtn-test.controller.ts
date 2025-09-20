import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';
import { Public } from 'nest-keycloak-connect';
import { FinancialTransactionState, FinancialTransactionErrorType } from 'src/financial-transaction/enum';
import { FinancialTransactionType, PaymentStrategyType } from 'src/financial-payment/enum';
import { MtnMoneyStrategyPayment } from 'src/financial-payment/strategies/mtn-money/mtn-money.strategy';
import { FinancialTransactionService } from '../services/financial-transaction.service';
import mongoose from 'mongoose';

@ApiTags('MTN Test')
@Controller('mtn-test')
export class MtnTestController {
  constructor(
    private readonly configService: ConfigService,
    private readonly mtnStrategy: MtnMoneyStrategyPayment,
    private readonly financialTransactionService: FinancialTransactionService
  ) {}

  // Endpoint pour créer un utilisateur API MTN
  @Post('create-api-user')
  @ApiOperation({ summary: 'Create new MTN API user and get API key' })
  @Public()
  async createApiUser() {
    try {
      console.log('Creating new MTN API user...');
      
      const result = await this.mtnStrategy.createApiUser();
      
      console.log('API user created successfully:', result);
      
      return {
        success: true,
        message: 'API user created successfully',
        data: {
          uuid: result.uuid,
          apiKey: result.apiKey,
          instructions: result.instructions
        }
      };
    } catch (error) {
      console.error('Error creating API user:', error);
      return {
        success: false,
        message: 'Failed to create API user',
        error: error.message || 'Unknown error'
      };
    }
  }

  // Endpoint pour tester un dépôt MTN
  @Post('deposit')
  @ApiOperation({ summary: 'Test MTN deposit (dev only)' })
  @Public()
  async testDeposit(@Body() data: any) {
    try {
      console.log('Test deposit with data:', data);
      
      // Valider les données
      if (!data.amount || !data.phoneNumber) {
        return {
          success: false,
          message: 'Amount and phoneNumber are required'
        };
      }
      
      // Formater le numéro de téléphone
      const phoneNumber = data.phoneNumber.toString().replace(/\s+/g, '');
      
      // Créer un objet transaction
      const transactionData = {
        ref: uuidv4(),
        amount: data.amount,
        phoneNumber: phoneNumber,
        description: data.description || 'Test deposit',
        type: FinancialTransactionType.DEPOSIT,
        state: FinancialTransactionState.FINANCIAL_TRANSACTION_START,
        raison: data.description || 'Test deposit',
        moneyCode: 'EUR', // Utiliser EUR pour les tests
        startDate: new Date(),
        endDate: new Date(),
        error: FinancialTransactionErrorType.NO_ERROR,
        token: '',
        paymentMode: PaymentStrategyType.MTN_MONEY,
        application: data.applicationId || new mongoose.Types.ObjectId(),
        userRef: { fullName: 'Test User', account: phoneNumber },
        wallet: data.walletId || new mongoose.Types.ObjectId(),
        createdAt: new Date()
      };
      
      console.log('Creating transaction with data:', JSON.stringify(transactionData, null, 2));
      
      // Sauvegarder la transaction en base de données
      const savedTransaction = await this.financialTransactionService.create(transactionData);
      console.log('Transaction saved with ID:', savedTransaction._id);
      
      // Appeler la stratégie MTN Money
      console.log('Initiating MTN deposit...');
      const result = await this.mtnStrategy.buy(savedTransaction);
      console.log('MTN deposit result:', result);
      
      // Vérifier si le résultat est valide et contient un statut PENDING
      const isSuccess = result && 
                       (result.status === 'PENDING' || 
                        (result.error === FinancialTransactionErrorType.NO_ERROR));
      
      return {
        success: isSuccess,
        message: isSuccess ? 'Deposit initiated successfully' : 'Failed to initiate deposit',
        data: {
          transactionId: savedTransaction._id,
          transactionRef: savedTransaction.ref,
          result
        }
      };
    } catch (error) {
      console.error('Error in testDeposit:', error);
      return {
        success: false,
        message: 'Failed to initiate deposit',
        error: error.message || 'Unknown error'
      };
    }
  }

  // Endpoint pour vérifier le statut d'une transaction
  @Get('check-transaction')
  @ApiOperation({ summary: 'Check MTN transaction status (dev only)' })
  @Public()
  async checkTransaction(@Query('ref') ref: string) {
    try {
      if (!ref) {
        return {
          success: false,
          message: 'Transaction reference is required'
        };
      }
      
      console.log('Checking transaction with ref:', ref);
      
      // Trouver la transaction dans la base de données
      const transaction = await this.financialTransactionService.findOneDocument({ ref });
      
      if (!transaction) {
        return {
          success: false,
          message: `Transaction with reference ${ref} not found`
        };
      }
      
      console.log('Transaction found:', transaction._id);
      
      // Vérifier le statut de la transaction
      const result = await this.mtnStrategy.check(transaction);
      console.log('MTN check result:', result);

      // Mettre à jour l'état de la transaction dans la base de données
      if (result.status === 'SUCCESSFUL') {
        await this.financialTransactionService.update(
          transaction._id,
          { 
            state: FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS,
            endDate: new Date()
          }
        );
        console.log('Transaction updated to SUCCESS state');
      } else if (result.status === 'FAILED') {
        await this.financialTransactionService.update(
          transaction._id,
          { 
            state: FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
            endDate: new Date()
          }
        );
        console.log('Transaction updated to ERROR state');
      }
      
      return {
        success: true,
        message: 'Transaction status checked successfully',
        data: {
          transactionId: transaction._id,
          transactionRef: transaction.ref,
          status: result.status,
          details: result
        }
      };
    } catch (error) {
      console.error('Error in checkTransaction:', error);
      return {
        success: false,
        message: 'Failed to check transaction status',
        error: error.message || 'Unknown error'
      };
    }
  }

  // Endpoint pour tester un retrait MTN
  @Post('withdraw')
  @ApiOperation({ summary: 'Test MTN withdrawal (dev only)' })
  @Public()
  async testWithdrawal(@Body() data: any) {
    try {
      console.log('Test withdrawal with data:', data);
      
      // Valider les données
      if (!data.amount || !data.phoneNumber) {
        return {
          success: false,
          message: 'Amount and phoneNumber are required'
        };
      }
      
      // Formater le numéro de téléphone
      const phoneNumber = data.phoneNumber.toString().replace(/\s+/g, '');
      
      // Créer un objet transaction pour le retrait
      const transactionData = {
        _id: new mongoose.Types.ObjectId(),
        ref: uuidv4(),
        amount: data.amount,
        phoneNumber: phoneNumber,
        description: data.description || 'Test withdrawal',
        type: FinancialTransactionType.WITHDRAW,
        state: FinancialTransactionState.FINANCIAL_TRANSACTION_START,
        raison: data.description || 'Test withdrawal',
        moneyCode: this.configService.get<string>('MOMO_API_CURRENCY') || 'EUR',
        startDate: new Date(),
        endDate: new Date(), // Définir une valeur par défaut pour endDate
        error: FinancialTransactionErrorType.NO_ERROR,
        token: '',
        paymentMode: PaymentStrategyType.MTN_MONEY,
        application: data.applicationId || new mongoose.Types.ObjectId(),
        userRef: { fullName: 'Test User', account: phoneNumber },
        wallet: data.walletId || new mongoose.Types.ObjectId(),
        createdAt: new Date()
      };
      
      console.log('Creating withdrawal transaction in database...');
      
      // Sauvegarder la transaction dans la base de données
      const savedTransaction = await this.financialTransactionService.create(transactionData);
      console.log('Withdrawal transaction saved to database:', savedTransaction._id);
      
      // Effectuer le retrait
      console.log('Initiating MTN withdrawal...');
      const result = await this.mtnStrategy.withdrawal(savedTransaction);
      console.log('MTN withdrawal result:', result);
      
      // Mettre à jour la transaction avec la référence de retrait si disponible
      if (result.ref) {
        await this.financialTransactionService.update(
          savedTransaction._id,
          { ref: result.ref }
        );
        console.log('Transaction updated with withdrawal reference:', result.ref);
      }
      
      return {
        success: result.error === FinancialTransactionErrorType.NO_ERROR,
        message: result.error === FinancialTransactionErrorType.NO_ERROR ? 'Withdrawal initiated successfully' : 'Failed to initiate withdrawal',
        data: {
          transactionId: savedTransaction._id,
          transactionRef: result.ref || savedTransaction.ref,
          result
        }
      };
    } catch (error) {
      console.error('Error in testWithdrawal:', error);
      return {
        success: false,
        message: 'Failed to initiate withdrawal',
        error: error.message || 'Unknown error'
      };
    }
  }

  // Alias pour l'endpoint de retrait (pour compatibilité)
  @Post('test-withdrawal')
  @ApiOperation({ summary: 'Alias for withdraw endpoint' })
  @Public()
  async testWithdrawalAlias(@Body() data: any) {
    return this.testWithdrawal(data);
  }

  // Endpoint pour vérifier le statut d'un retrait
  @Get('check-withdrawal')
  @ApiOperation({ summary: 'Check MTN withdrawal status (dev only)' })
  @Public()
  async checkWithdrawalStatus(@Query('ref') ref: string) {
    try {
      if (!ref) {
        return {
          success: false,
          message: 'Transaction reference is required'
        };
      }
      
      console.log('Checking withdrawal with ref:', ref);
      
      // Trouver la transaction dans la base de données
      const transaction = await this.financialTransactionService.findOneDocument({ ref });
      
      if (!transaction) {
        return {
          success: false,
          message: `Transaction with reference ${ref} not found`
        };
      }
      
      console.log('Transaction found:', transaction._id);
      console.log('Transaction details:', JSON.stringify(transaction, null, 2));
      
      // Vérifier le statut du retrait
      try {
        const result = await this.mtnStrategy.checkWithdrawal(transaction);
        console.log('MTN withdrawal check result:', result);
        
        // Mettre à jour l'état de la transaction dans la base de données
        if (result.status === 'SUCCESSFUL') {
          await this.financialTransactionService.update(
            transaction._id,
            { 
              state: FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS,
              endDate: new Date()
            }
          );
          console.log('Transaction updated to SUCCESS state');
        } else if (result.status === 'FAILED') {
          await this.financialTransactionService.update(
            transaction._id,
            { 
              state: FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
              endDate: new Date()
            }
          );
          console.log('Transaction updated to ERROR state');
        }
        
        return {
          success: true,
          message: 'Withdrawal status checked successfully',
          data: {
            transactionId: transaction._id,
            transactionRef: transaction.ref,
            status: result.status,
            details: result
          }
        };
      } catch (checkError) {
        console.error('Error checking withdrawal status:', checkError);
        return {
          success: false,
          message: 'Error checking withdrawal status',
          error: checkError.message || 'Unknown error',
          details: checkError.response?.data || {}
        };
      }
    } catch (error) {
      console.error('Error in checkWithdrawalStatus:', error);
      return {
        success: false,
        message: 'Failed to check withdrawal status',
        error: error.message || 'Unknown error',
        stack: error.stack
      };
    }
  }

  // Endpoint pour annuler une transaction
  @Get('cancel-transaction')
  @ApiOperation({ summary: 'Cancel MTN transaction (dev only)' })
  @Public()
  async cancelTransaction(@Query('ref') ref: string) {
    try {
      if (!ref) {
        return {
          success: false,
          message: 'Transaction reference is required'
        };
      }
      
      console.log('Cancelling transaction with ref:', ref);
      
      // Trouver la transaction dans la base de données
      const transaction = await this.financialTransactionService.findOneDocument({ ref });
      
      if (!transaction) {
        return {
          success: false,
          message: `Transaction with reference ${ref} not found`
        };
      }
      
      console.log('Transaction found:', transaction._id);
      
      // Annuler la transaction
      const result = await this.mtnStrategy.cancel(transaction);
      console.log('MTN cancel result:', result);
      
      // Mettre à jour l'état de la transaction dans la base de données
      await this.financialTransactionService.update(
        transaction._id,
        { 
          state: FinancialTransactionState.FINANCIAL_TRANSACTION_CANCEL,
          endDate: new Date()
        }
      );
      console.log('Transaction updated to CANCEL state');
      
      return {
        success: true,
        message: 'Transaction cancelled successfully',
        data: {
          transactionId: transaction._id,
          transactionRef: transaction.ref,
          result
        }
      };
    } catch (error) {
      console.error('Error in cancelTransaction:', error);
      return {
        success: false,
        message: 'Failed to cancel transaction',
        error: error.message || 'Unknown error'
      };
    }
  }

  // Endpoint pour vérifier la configuration MTN
  @Get('config')
  @ApiOperation({ summary: 'Check MTN configuration' })
  @Public()
  async checkConfig() {
    // Récupérer toutes les variables d'environnement liées à MTN
    const mtnConfig = {
      apiPath: this.configService.get<string>('MOMO_API_PATH'),
      apiMode: this.configService.get<string>('MOMO_API_MODE_ENV'),
      apiUuid: this.configService.get<string>('MOMO_API_DEFAULT_UUID'),
      apiKey: this.configService.get<string>('MOMO_API_KEY'),
      primaryKey: this.configService.get<string>('MOMO_API_PRIMARY_KEY'),
      secondaryKey: this.configService.get<string>('MOMO_API_SECONDARY_KEY'),
      currency: this.configService.get<string>('MOMO_API_CURRENCY') || 'EUR',
      callbackHost: this.configService.get<string>('MOMO_API_CALLBACK_HOST'),
      environment: this.configService.get<string>('NODE_ENV')
    };
    
    // Masquer les parties sensibles des clés
    const maskedConfig = { ...mtnConfig };
    for (const key in maskedConfig) {
      if (typeof maskedConfig[key] === 'string' && maskedConfig[key].length > 10) {
        maskedConfig[key] = maskedConfig[key].substring(0, 5) + '...' + 
                          maskedConfig[key].substring(maskedConfig[key].length - 5);
      }
    }
    
    return {
      success: true,
      config: maskedConfig
    };
  }
}


