import { Injectable } from '@nestjs/common';
import { UserService } from '../../user/services/user.services';
import { ApplicationService } from '../../application/services/application.services';
import { FinancialTransactionService } from '../../financial-transaction/services/financial-transaction.service';
import { DashboardStatsDTO, TransactionDTO } from '../dtos/dashboard-stats.dto';
import { Request } from 'express';
import { PaymentStrategyType } from '../../financial-payment/enum/finance.enum';

@Injectable()
export class DashboardService {
  constructor(
    private readonly userService: UserService,
    private readonly applicationService: ApplicationService,
    private readonly financialTransactionService: FinancialTransactionService
  ) {}

  async getDashboardStats(req: Request): Promise<DashboardStatsDTO> {
    // Utiliser any pour accéder aux propriétés de l'utilisateur
    const user = req.user as any;
    const userId = user?.sub;
    
    // Vérifier si l'utilisateur est admin
    const isAdmin = user?.resource_access?.['y-nkap']?.roles?.includes('admin');
    
    // Obtenir le nombre d'utilisateurs (pour les admins) ou 1 pour les utilisateurs normaux
    const amountOfUser = isAdmin 
      ? await this.getUserCount() 
      : 1;
    
    // Obtenir la méthode de paiement la plus utilisée par l'utilisateur
    const paymentMethod = await this.getMostUsedPaymentMethod(userId);
    
    // Obtenir les applications de l'utilisateur
    const applications = await this.getApplications(req);
    const numberOfApplication = applications.length;
    
    // Obtenir toutes les transactions pour toutes les applications de l'utilisateur
    const appIds = applications.map(app => app._id.toString());
    const allTransactionOfAllApplicationForAnUser = await this.getAllTransactions(appIds);
    
    return {
      amountOfUser,
      paymentMethod,
      allTransactionOfAllApplicationForAnUser,
      numberOfApplication
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
  
  private async getAllTransactions(appIds: string[]): Promise<TransactionDTO[]> {
    // Implémentation pour obtenir toutes les transactions
    try {
      if (!appIds.length) return [];
      
      const transactions = await this.financialTransactionService.findByField({
        application: { $in: appIds }
      });
      
      // Transformer les documents en objets DTO
      return transactions.map(transaction => ({
        _id: transaction._id.toString(),
        ref: transaction.ref,
        amount: transaction.amount,
        moneyCode: transaction.moneyCode,
        state: transaction.state,
        type: transaction.type,
        paymentMode: transaction.paymentMode,
        createdAt: transaction.createdAt,
        application: transaction.application.toString()
      }));
    } catch (error) {
      console.error('Error getting transactions:', error);
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


