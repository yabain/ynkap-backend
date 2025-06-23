import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApplicationService } from '../application/services';
import { FinancialTransactionService } from '../financial-transaction/services';
import { WalletService } from '../wallet/services';
import { TransactionGenerator } from './data-generators/transaction-generator';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const applicationService = app.get(ApplicationService);
    const financialTransactionService = app.get(FinancialTransactionService);
    const walletService = app.get(WalletService);
    
    console.log('Récupération des applications...');
    const applications = await applicationService.findAll();
    
    if (applications.length === 0) {
      console.error('Aucune application trouvée. Veuillez créer des applications d\'abord.');
      await app.close();
      return;
    }
    
    console.log(`${applications.length} applications trouvées.`);
    
    const transactionGenerator = new TransactionGenerator();
    const transactionsPerApp = 20;
    let totalTransactionsCreated = 0;
    
    // Pour chaque application, créer des transactions
    for (const app of applications) {
      console.log(`Création de transactions pour l'application: ${app.name} (${app._id})`);
      
      const wallet = await walletService.findOneByField({ application: app._id });
      
      if (!wallet) {
        console.warn(`Aucun portefeuille trouvé pour l'application ${app.name}. Passage à l'application suivante.`);
        continue;
      }
      
      // Générer les transactions en passant les IDs sous forme de chaînes
      const transactions = transactionGenerator.generateTransactions(
        app._id.toString(), 
        wallet._id.toString(), 
        transactionsPerApp
      );
      
      // Utiliser une session pour insérer toutes les transactions en une seule opération
      await financialTransactionService.executeWithTransaction(async (session) => {
        for (const transaction of transactions) {
          await financialTransactionService.create(transaction, session);
          totalTransactionsCreated++;
        }
      });
      
      console.log(`${transactionsPerApp} transactions créées pour l'application ${app.name}`);
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
