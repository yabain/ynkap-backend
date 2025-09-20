/**
 * Script pour générer des transactions de test
 * Exécuter avec: npm run seed:transactions-simple
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApplicationService } from '../application/services';
import { FinancialTransactionService } from '../financial-transaction/services';
import { getModelToken } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FinancialTransactionState } from '../financial-transaction/enum';
import { FinancialTransactionType, PaymentMoneyCode, PaymentStrategyType } from '../financial-payment/enum';
import { UtilsFunc } from '../financial-transaction/utils/utils-func';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  
  try {
    const applicationService = app.get(ApplicationService);
    const financialTransactionService = app.get(FinancialTransactionService);
    const walletModel = app.get(getModelToken('Wallet')) as Model<any>;
    
    console.log('🚀 Démarrage de la génération de transactions...');
    
    const applications = await applicationService.findAll();
    
    if (applications.length === 0) {
      console.error('❌ Aucune application trouvée');
      return;
    }
    
    console.log(`📱 ${applications.length} applications trouvées`);
    
    // Tous les opérateurs disponibles
    const paymentModes = [
      PaymentStrategyType.MTN_MONEY,
      PaymentStrategyType.ORANGE_MONEY,
      PaymentStrategyType.BANK
    ];
    
    // Numéros de téléphone pour chaque opérateur
    const phoneNumbers = {
      [PaymentStrategyType.MTN_MONEY]: ['237671162552', '237677123456', '237678987654'],
      [PaymentStrategyType.ORANGE_MONEY]: ['237698295368', '237699887766', '237697123456'],
      [PaymentStrategyType.BANK]: ['237655443322', '237656789012', '237654321098']
    };
    
    // Noms d'utilisateurs variés
    const userNames = ['WABA  ULRICH', 'TIENTCHEU IGOR', 'SIEWE FORTUNE', 'CHRIST TOUKAM', 'KELL MOMO', 'mr le ZIZI'];
    
    // Raisons de transaction variées
    const reasons = [
      'Paiement de frais de scolarité',
      'Achat de crédit téléphonique',
      'Paiement de facture d\'électricité',
      'Transfert d\'argent familial',
      'Abonnement mensuel',
      'Donation charitable',
      'Achat en ligne',
      'Paiement de loyer'
    ];
    
  const transactionsPerApp = Math.floor(Math.random() * 5) + 3;
    let totalCreated = 0;
    
    for (const app of applications) {
      console.log(`\n🔄 Application: ${app.name}`);
      
      const wallet = await walletModel.findOne({ application: app._id });
      
      if (!wallet) {
        console.warn(`⚠️ Pas de wallet pour ${app.name}`);
        continue;
      }
      
      for (let i = 0; i < transactionsPerApp; i++) {
        // Sélectionner un opérateur aléatoire
        const paymentMode = paymentModes[Math.floor(Math.random() * paymentModes.length)];
        
        // Sélectionner un numéro correspondant à l'opérateur
        const operatorPhones = phoneNumbers[paymentMode];
        const phoneNumber = operatorPhones[Math.floor(Math.random() * operatorPhones.length)];
        
        // Autres données aléatoires
        const userName = userNames[Math.floor(Math.random() * userNames.length)];
        const reason = reasons[Math.floor(Math.random() * reasons.length)];
        const amount = Math.floor(Math.random() * 50000) + 1000;
        const type = Math.random() > 0.5 ? FinancialTransactionType.DEPOSIT : FinancialTransactionType.WITHDRAW;
        
        // État de transaction (90% succès, 10% échec)
        const state = Math.random() > 0.1 
          ? FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS 
          : FinancialTransactionState.FINANCIAL_TRANSACTION_CANCEL;
        
        // Générer une date aléatoire sur les 12 derniers mois
        const now = new Date();
        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(now.getFullYear() - 1);
        
        const randomTimestamp = oneYearAgo.getTime() + Math.random() * (now.getTime() - oneYearAgo.getTime());
        const transactionDate = new Date(randomTimestamp);
        
        const transactionData = {
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
          await financialTransactionService.create(transactionData);
          totalCreated++;
          
          // Afficher le progrès
          if ((i + 1) % 10 === 0) {
            console.log(`  📊 ${i + 1}/${transactionsPerApp} transactions créées`);
          }
        } catch (error) {
          console.error(`❌ Erreur transaction ${i + 1}:`, error.message);
        }
      }
      
      console.log(`✅ ${transactionsPerApp} transactions créées pour ${app.name}`);
      
      // Afficher un résumé par opérateur pour cette app
      console.log(`📱 Répartition par opérateur:`);
      console.log(`   - MTN Money: ~${Math.floor(transactionsPerApp/3)} transactions`);
      console.log(`   - Orange Money: ~${Math.floor(transactionsPerApp/3)} transactions`);
      console.log(`   - Bank: ~${Math.floor(transactionsPerApp/3)} transactions`);
    }
    
    console.log(`\n🎉 Total: ${totalCreated} transactions créées`);
    console.log(`📊 Répartition globale estimée:`);
    console.log(`   - MTN Money: ~${Math.floor(totalCreated/3)} transactions`);
    console.log(`   - Orange Money: ~${Math.floor(totalCreated/3)} transactions`);
    console.log(`   - Bank: ~${Math.floor(totalCreated/3)} transactions`);
    
  } catch (error) {
    console.error('💥 Erreur:', error.message);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();


