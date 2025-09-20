import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.services';
import { ApplicationService } from '../../application/services/application.services';
import { FinancialTransactionService } from '../../financial-transaction/services/financial-transaction.service';
import { DashboardStatsDTO, TransactionDTO } from '../dtos/dashboard-stats.dto';
import { Request } from 'express';
import { PaymentStrategyType } from '../../financial-payment/enum/finance.enum';
import * as mongoose from 'mongoose';

@Injectable()
export class DashboardService {
  constructor(
    private readonly userService: UserService,
    private readonly applicationService: ApplicationService,
    private readonly financialTransactionService: FinancialTransactionService
  ) {}

  async getDashboardStats(req: Request, filterYear?: number, limit: number = 100): Promise<DashboardStatsDTO> {
    const user = req.user as any;
    const userId = user?.sub;
    
    const isAdmin = user?.resource_access?.['y-nkap']?.roles?.includes('admin');
    
    const amountOfUser = isAdmin 
      ? await this.getUserCount() 
      : 1;
    
    const paymentMethod = await this.getMostUsedPaymentMethod(userId);
    
    const applications = await this.getApplications(req);
    const numberOfApplication = applications.length;
    
    const appIds = applications.map(app => app._id.toString());
    
    // Obtenir les transactions groupées par année
    const transactionsByYear = await this.getTransactionsByYear(appIds, filterYear, limit);
    
    // Obtenir les années disponibles
    const availableYears = await this.getAvailableYears(appIds);
    
    return {
      amountOfUser,
      paymentMethod,
      transactionsByYear,
      numberOfApplication,
      availableYears
    };
  }
  
  private async getUserCount(): Promise<number> {
    // Implémentation de la méthode pour compter les utilisateurs
    try {
      return await this.userService.findAll().then(users => users.length);
    } catch (error) {
      console.error('Error counting users:', error);
      return 0;
    }
  }
  
  private async getApplications(req: Request): Promise<any[]> {
    // Implémentation pour obtenir les applications de l'utilisateur
    try {
      const user = req.user as any;
      return await this.applicationService.findByField({ user: user?.sub }) || [];
    } catch (error) {
      console.error('Error getting applications:', error);
      return [];
    }
  }
  
  private async getTransactionsByYear(appIds: string[], filterYear?: number, limit: number = 100) {
    try {
      if (!appIds.length) return [];
      
      // Pipeline d'agrégation MongoDB
      const pipeline: any[] = [
        {
          $match: {
            application: { $in: appIds.map(id => new mongoose.Types.ObjectId(id)) }
          }
        },
        {
          $addFields: {
            year: { $year: "$createdAt" }
          }
        }
      ];

      // Filtrer par année si spécifiée
      if (filterYear) {
        pipeline.push({
          $match: { year: filterYear }
        });
      }

      // Grouper par année
      pipeline.push(
        {
          $group: {
            _id: "$year",
            count: { $sum: 1 },
            totalAmount: { $sum: "$amount" },
            transactions: { 
              $push: {
                _id: "$_id",
                ref: "$ref",
                amount: "$amount",
                moneyCode: "$moneyCode",
                state: "$state",
                type: "$type",
                paymentMode: "$paymentMode",
                createdAt: "$createdAt",
                application: "$application",
                year: "$year"
              }
            }
          }
        },
        {
          $sort: { _id: -1 } // Trier par année décroissante
        }
      );

      const results = await this.financialTransactionService.aggregate(pipeline);
      
      return results.map(result => ({
        year: result._id,
        count: result.count,
        totalAmount: result.totalAmount,
        transactions: result.transactions.slice(0, limit) // Limiter le nombre de transactions
      }));
      
    } catch (error) {
      console.error('Error getting transactions by year:', error);
      return [];
    }
  }

  private async getAvailableYears(appIds: string[]): Promise<number[]> {
    try {
      if (!appIds.length) return [];
      
      const pipeline = [
        {
          $match: {
            application: { $in: appIds.map(id => new mongoose.Types.ObjectId(id)) }
          }
        },
        {
          $group: {
            _id: { $year: "$createdAt" }
          }
        },
        {
          $sort: { _id: -1 }
        }
      ];

      const results = await this.financialTransactionService.aggregate(pipeline);
      return results.map(result => result._id);
      
    } catch (error) {
      console.error('Error getting available years:', error);
      return [];
    }
  }
  
  private async getMostUsedPaymentMethod(userId: string): Promise<string> {
    try {
      // Obtenir toutes les transactions de l'utilisateur
      const transactions = await this.financialTransactionService.findByField({
        'userRef.account': userId
      });
      
      if (!transactions || transactions.length === 0) {
        return 'Aucune méthode utilisée';
      }
      
      // Compter les occurrences de chaque méthode de paiement
      const paymentMethodCounts = transactions.reduce((acc, transaction) => {
        const method = transaction.paymentMode;
        acc[method] = (acc[method] || 0) + 1;
        return acc;
      }, {});
      
      // Trouver la méthode la plus utilisée
      let mostUsedMethod = Object.keys(paymentMethodCounts)[0];
      let maxCount = paymentMethodCounts[mostUsedMethod];
      
      Object.keys(paymentMethodCounts).forEach(method => {
        if (paymentMethodCounts[method] > maxCount) {
          mostUsedMethod = method;
          maxCount = paymentMethodCounts[method];
        }
      });
      
      // Convertir l'enum en nom lisible
      switch (mostUsedMethod) {
        case PaymentStrategyType.MTN_MONEY:
          return 'MTN Money';
        case PaymentStrategyType.ORANGE_MONEY:
          return 'Orange Money';
        case PaymentStrategyType.CREDIT_CARD:
          return 'Carte de crédit';
        case PaymentStrategyType.BANK:
          return 'Virement bancaire';
        default:
          return mostUsedMethod || 'Aucune méthode utilisée';
      }
    } catch (error) {
      console.error('Error getting most used payment method:', error);
      return 'Indéterminé';
    }
  }
}



