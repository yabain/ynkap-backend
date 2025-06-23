import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MtnMoneyStrategyPayment } from 'src/financial-payment/strategies/mtn-money/mtn-money.strategy';
import { FinancialTransactionService } from '../services/financial-transaction.service';
import { FinancialTransactionState, FinancialTransactionErrorType } from '../enum';
import { FinancialTransactionType } from 'src/financial-payment/enum';
import { FinancialTransaction } from '../models';
import { v4 as uuidv4 } from 'uuid';

@ApiTags('MTN Money Test')
@Controller('mtn-test')
export class MtnTestController {
  constructor(
    private readonly mtnStrategy: MtnMoneyStrategyPayment,
    private readonly financialTransactionService: FinancialTransactionService
  ) {}

  @Post('create-api-user')
  @ApiOperation({ summary: 'Create MTN API User (dev only)' })
  async createApiUser() {
    try {
      const result = await this.mtnStrategy.createApiUser();
      return {
        success: true,
        message: 'API User created successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create API User',
        error: error.message
      };
    }
  }

  @Get('check-transaction')
  @ApiOperation({ summary: 'Check MTN transaction status (dev only)' })
  async checkTransaction(@Query('ref') ref: string) {
    try {
      const transaction = await this.financialTransactionService.findOne({ ref });
      
      if (!transaction) {
        return {
          success: false,
          message: `Transaction with reference ${ref} not found`
        };
      }
      
      const result = await this.mtnStrategy.check(transaction);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check transaction',
        error: error.message
      };
    }
  }

  @Post('test-deposit')
  @ApiOperation({ summary: 'Test MTN deposit (dev only)' })
  async testDeposit(@Body() data: { phoneNumber: string, amount: number, description?: string }) {
    try {
      // Créer une transaction temporaire pour le test
      const transaction = new FinancialTransaction();
      transaction._id = uuidv4();
      transaction.ref = uuidv4();
      transaction.amount = data.amount;
      transaction.phoneNumber = data.phoneNumber;
      transaction.description = data.description || 'Test deposit';
      transaction.type = FinancialTransactionType.DEPOSIT;
      transaction.state = FinancialTransactionState.FINANCIAL_TRANSACTION_START;
      
      // Sauvegarder la transaction dans la base de données
      await this.financialTransactionService.create(transaction);
      
      // Effectuer le dépôt
      const result = await this.mtnStrategy.buy(transaction);
      
      return {
        success: true,
        message: 'Deposit initiated successfully',
        data: {
          transactionRef: transaction.ref,
          result
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to initiate deposit',
        error: error.message
      };
    }
  }

  @Post('test-withdrawal')
  @ApiOperation({ summary: 'Test MTN withdrawal (dev only)' })
  async testWithdrawal(@Body() data: { phoneNumber: string, amount: number, description?: string }) {
    try {
      // Créer une transaction temporaire pour le test
      const transaction = new FinancialTransaction();
      transaction._id = uuidv4();
      transaction.ref = uuidv4();
      transaction.amount = data.amount;
      transaction.phoneNumber = data.phoneNumber;
      transaction.description = data.description || 'Test withdrawal';
      transaction.type = FinancialTransactionType.WITHDRAW;
      transaction.state = FinancialTransactionState.FINANCIAL_TRANSACTION_START;
      
      // Sauvegarder la transaction dans la base de données
      await this.financialTransactionService.create(transaction);
      
      // Effectuer le retrait
      const result = await this.mtnStrategy.withdrawal(transaction);
      
      return {
        success: true,
        message: 'Withdrawal initiated successfully',
        data: {
          transactionRef: transaction.ref,
          result
        }
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to initiate withdrawal',
        error: error.message
      };
    }
  }

  @Get('check-withdrawal')
  @ApiOperation({ summary: 'Check MTN withdrawal status (dev only)' })
  async checkWithdrawal(@Query('ref') ref: string) {
    try {
      const transaction = await this.financialTransactionService.findOne({ ref });
      
      if (!transaction) {
        return {
          success: false,
          message: `Transaction with reference ${ref} not found`
        };
      }
      
      const result = await this.mtnStrategy.checkWithdrawal(transaction);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to check withdrawal',
        error: error.message
      };
    }
  }

  @Post('cancel-transaction')
  @ApiOperation({ summary: 'Cancel MTN transaction (dev only)' })
  async cancelTransaction(@Query('ref') ref: string) {
    try {
      const transaction = await this.financialTransactionService.findOne({ ref });
      
      if (!transaction) {
        return {
          success: false,
          message: `Transaction with reference ${ref} not found`
        };
      }
      
      const result = await this.mtnStrategy.cancel(transaction);
      
      // Mettre à jour l'état de la transaction dans la base de données
      transaction.state = FinancialTransactionState.FINANCIAL_TRANSACTION_CANCEL;
      await this.financialTransactionService.update(transaction._id, transaction);
      
      return {
        success: true,
        message: 'Transaction cancelled successfully',
        data: result
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to cancel transaction',
        error: error.message
      };
    }
  }
}




