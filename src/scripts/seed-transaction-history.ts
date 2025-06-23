/**
 * Script pour générer des données de test pour l'historique des transactions
 * Exécuter avec: npx ts-node -r tsconfig-paths/register src/scripts/seed-transaction-history.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApplicationService } from '../application/services';
import { FinancialTransactionService } from '../financial-transaction/services';
import { FinancialTransactionState } from '../financial-transaction/enum';
import { FinancialTransactionType, PaymentMoneyCode, PaymentStrategyType } from '../financial-payment/enum';
import { UtilsFunc } from '../financial-transaction/utils/utils-func';
import mongoose from 'mongoose';
import { WalletService } from '../wallet/services';

// Fonction pour générer une date aléatoire dans une plage
function randomDate(start: Date, end: Date): Date {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

// Fonction pour générer un montant aléatoire
function randomAmount(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

// Fonction pour choisir aléatoirement un élément d'un tableau
function randomChoice<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const applicationService = app.get(ApplicationService);
    const financialTransactionService = app.get(FinancialTransactionService);
    const walletService = app.get(WalletService);
    
    console.log('Récupération des applications...');
    
    // Récupérer toutes les applications (ou vous pouvez spécifier un utilisateur)
    const applications = await applicationService.findAll();
    
    if (applications.length === 0) {
      console.error('Aucune application trouvée. Veuillez créer des applications d\'abord.');
      await app.close();
      return;
    }
    
    console.log(`${applications.length} applications trouvées.`);
    
    // Configurations pour les données de test
    const transactionsPerApp = 20; // Nombre de transactions à créer par application
    const phoneNumbers = ['237671162552', '237698295368', '237699887766', '237655443322'];
    const userNames = ['John Doe', 'Jane Smith', 'Robert Johnson', 'Emily Davis'];
    const reasons = [
      'Paiement de frais de scolarité',
      'Achat de crédit',
      'Paiement de facture',
      'Transfert d\'argent',
      'Abonnement mensuel',
      'Donation'
    ];
    const paymentModes = [
      PaymentStrategyType.ORANGE_MONEY,
      PaymentStrategyType.MTN_MONEY,
      PaymentStrategyType.BANK
    ];
    const transactionStates = [
      FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS,
      FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
      FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING
    ];
    const transactionTypes = [
      FinancialTransactionType.DEPOSIT,
      FinancialTransactionType.WITHDRAW
    ];
    
    // Date de début et de fin pour les transactions (6 derniers mois)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 6);
    
    console.log('Création des transactions de test...');
    
    let totalTransactionsCreated = 0;
    
    // Pour chaque application, créer des transactions
    for (const app of applications) {
      console.log(`Création de transactions pour l'application: ${app.name} (${app._id})`);
      
      // Récupérer le portefeuille associé à l'application
      const wallet = await walletService.findOneByField({ application: app._id });
      
      if (!wallet) {
        console.warn(`Aucun portefeuille trouvé pour l'application ${app.name}. Passage à l'application suivante.`);
        continue;
      }
      
      // Créer plusieurs transactions pour cette application
      for (let i = 0; i < transactionsPerApp; i++) {
        const transactionDate = randomDate(startDate, endDate);
        const phoneNumber = randomChoice(phoneNumbers);
        const userName = randomChoice(userNames);
        const reason = randomChoice(reasons);
        const paymentMode = randomChoice(paymentModes);
        const state = randomChoice(transactionStates);
        const type = randomChoice(transactionTypes);
        const amount = randomAmount(1000, 50000);
        
        const transaction = {
          state,
          startDate: transactionDate,
          endDate: transactionDate,
          amount,
          raison: reason,
          type,
          ref: UtilsFunc.generateUniqueRef(),
          token: '',
          error: 0,
          paymentMode,
          application: app._id,
          moneyCode: PaymentMoneyCode.XAF,
          userRef: {
            fullName: userName,
            account: phoneNumber
          },
          wallet: wallet._id,
          createdAt: transactionDate,
          phoneNumber,
          description: reason
        };
        
        try {
          await financialTransactionService.create(transaction);
          totalTransactionsCreated++;
          
          if (totalTransactionsCreated % 10 === 0) {
            console.log(`${totalTransactionsCreated} transactions créées...`);
          }
        } catch (error) {
          console.error(`Erreur lors de la création d'une transaction:`, error.message);
        }
      }
    }
    
    console.log(`Terminé! ${totalTransactionsCreated} transactions de test ont été créées.`);
    
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la génération des données de test:', error);
    process.exit(1);
  }
}

bootstrap();
