/**
 * Script pour tester les paiements Orange Money en PRODUCTION
 * ⚠️ ATTENTION: Ce script effectue de VRAIS paiements avec de l'argent réel!
 * Exécuter avec: npm run test:orange-prod
 */

import * as readline from 'readline';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrangeMoneyStrategyPayment } from '../financial-payment/strategies/orange-money/orange-money.strategy';
import { FinancialTransactionService } from '../financial-transaction/services/financial-transaction.service';
import { FinancialTransactionType } from '../financial-payment/enum';
import { FinancialTransactionState, FinancialTransactionErrorType } from '../financial-transaction/enum';
import { PaymentStrategyType } from '../financial-payment/enum';
import { v4 as uuidv4 } from 'uuid';
import * as mongoose from 'mongoose';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Fonction de confirmation pour paiements réels
async function confirmRealPayment(amount: number, phoneNumber: string): Promise<boolean> {
  console.log('\n🚨 ATTENTION: PAIEMENT ORANGE MONEY RÉEL EN PRODUCTION 🚨');
  console.log(`💰 Montant: ${amount} XAF`);
  console.log(`📱 Numéro: ${phoneNumber}`);
  console.log('⚠️  Ce sera un vrai paiement avec de l\'argent réel!');
  console.log('💳 Le client recevra une notification Orange Money');
  
  const confirmation = await question('\n✅ Confirmez-vous ce paiement réel? (tapez "OUI CONFIRME" pour continuer): ');
  
  return confirmation.trim() === 'OUI CONFIRME';
}

async function testRealOrangeMoneyPayment() {
  console.log('🧪 === TEST PAIEMENT ORANGE MONEY PRODUCTION === 🧪');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const orangeStrategy = app.get(OrangeMoneyStrategyPayment);
  const transactionService = app.get(FinancialTransactionService);
  
  try {
    // Demander les informations de paiement
    const phoneNumber = await question('📱 Numéro Orange Money (ex: 237671162552): ');
    const amountStr = await question('💰 Montant en XAF (ex: 100): ');
    const amount = parseInt(amountStr, 10);
    const description = await question('📝 Description du paiement: ') || 'Paiement test Orange Money';
    
    // Validation des données
    if (!phoneNumber || !phoneNumber.match(/^237[0-9]{9}$/)) {
      console.log('❌ Numéro de téléphone invalide (format: 237XXXXXXXXX)');
      return;
    }
    
    if (isNaN(amount) || amount <= 0) {
      console.log('❌ Montant invalide');
      return;
    }
    
    // Confirmation obligatoire pour paiement réel
    const confirmed = await confirmRealPayment(amount, phoneNumber);
    if (!confirmed) {
      console.log('❌ Paiement annulé par l\'utilisateur');
      return;
    }
    
    console.log(`🚨 INITIATION DU PAIEMENT ORANGE MONEY RÉEL: ${amount} XAF vers ${phoneNumber}`);
    
    // Créer une transaction avec retry en cas d'erreur de connexion
    const transactionData = {
      ref: uuidv4(),
      amount: amount,
      phoneNumber: phoneNumber,
      description: description,
      type: FinancialTransactionType.DEPOSIT,
      state: FinancialTransactionState.FINANCIAL_TRANSACTION_START,
      raison: description,
      moneyCode: 'XAF',
      startDate: new Date(),
      endDate: new Date(),
      error: FinancialTransactionErrorType.NO_ERROR,
      token: '',
      paymentMode: PaymentStrategyType.ORANGE_MONEY,
      application: new mongoose.Types.ObjectId(),
      userRef: { fullName: 'ulrich Waba', account: phoneNumber },
      wallet: new mongoose.Types.ObjectId(),
      createdAt: new Date()
    };
    
    console.log('🚀 Création de la transaction...');
    
    let savedTransaction;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        savedTransaction = await transactionService.create(transactionData);
        console.log('✅ Transaction créée avec ID:', savedTransaction._id);
        console.log('📋 Référence:', savedTransaction.ref);
        break;
      } catch (dbError) {
        retryCount++;
        console.log(`⚠️ Erreur de connexion DB (tentative ${retryCount}/${maxRetries}):`, dbError.message);
        
        if (retryCount >= maxRetries) {
          console.log('❌ Impossible de créer la transaction après plusieurs tentatives');
          console.log('🔄 Continuons avec le paiement sans sauvegarder en DB...');
          
          // Créer une transaction temporaire pour le paiement
          savedTransaction = {
            _id: new mongoose.Types.ObjectId(),
            ...transactionData
          };
          break;
        }
        
        // Attendre 2 secondes avant de réessayer
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    
    console.log('💳 Initiation du paiement Orange Money...');
    const result = await orangeStrategy.buy(savedTransaction);
    
    console.log('📊 Résultat du paiement:');
    console.log('- Token:', result.token);
    console.log('- Erreur:', result.error);
    
    if (result.token && result.error === FinancialTransactionErrorType.NO_ERROR) {
      console.log('\n✅ Paiement initié avec succès!');
      console.log('📱 Le client devrait recevoir une notification Orange Money');
      console.log('💡 Token de paiement:', result.token);
      
      // Essayer de mettre à jour la transaction si elle existe en DB
      try {
        if (savedTransaction._id) {
          await transactionService.update(savedTransaction._id, {
            token: result.token,
            state: FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING
          });
          console.log('✅ Transaction mise à jour avec le token');
        }
      } catch (updateError) {
        console.log('⚠️ Impossible de mettre à jour la transaction en DB:', updateError.message);
      }
      
      console.log('\n⏳ Vérification du statut dans 30 secondes...');
      setTimeout(async () => {
        try {
          console.log('🔍 Vérification du statut du paiement...');
          
          // Créer une transaction temporaire avec le token pour la vérification
          const tempTransaction = {
            ...savedTransaction,
            token: result.token
          };
          
          const status = await orangeStrategy.check(tempTransaction) as any;
          console.log('📊 Statut du paiement:', status);
          
          // Essayer de mettre à jour selon le statut
          try {
            if (status && status.status === 'SUCCESS') {
              await transactionService.update(savedTransaction._id, {
                state: FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS,
                endDate: new Date()
              });
              console.log('✅ Transaction marquée comme réussie');
            } else if (status && status.status === 'FAILED') {
              await transactionService.update(savedTransaction._id, {
                state: FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR,
                endDate: new Date()
              });
              console.log('❌ Transaction marquée comme échouée');
            } else {
              console.log('⏳ Transaction toujours en attente');
            }
          } catch (finalUpdateError) {
            console.log('⚠️ Impossible de mettre à jour le statut final:', finalUpdateError.message);
            console.log('💡 Statut du paiement:', status);
          }
        } catch (error) {
          console.error('❌ Erreur de vérification:', error.message);
        }
        await app.close();
        rl.close();
      }, 30000);
      
    } else {
      console.log('❌ Paiement échoué immédiatement');
      console.log('🔍 Erreur:', result.error);
      await app.close();
      rl.close();
    }
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.stack) console.error(error.stack);
    await app.close();
    rl.close();
  }
}

async function checkOrangeMoneyTransaction() {
  console.log('🔍 === VÉRIFICATION TRANSACTION ORANGE MONEY === 🔍');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const orangeStrategy = app.get(OrangeMoneyStrategyPayment);
  
  try {
    const token = await question('🎫 Token de paiement Orange Money: ');
    
    if (!token) {
      console.log('❌ Token requis');
      return;
    }
    
    console.log('🔍 Vérification du statut...');
    
    // Créer une transaction temporaire pour la vérification
    const tempTransaction = {
      token: token,
      ref: 'temp-check',
      amount: 0,
      phoneNumber: '',
      description: 'Vérification statut'
    } as any;
    
    const status = await orangeStrategy.check(tempTransaction) as any;
    
    console.log('📊 Résultat de la vérification:');
    console.log(JSON.stringify(status, null, 2));
    
  } catch (error) {
    console.error('❌ Erreur lors de la vérification:', error.message);
  } finally {
    await app.close();
    rl.close();
  }
}

async function showMenu() {
  console.log('\n🍊 === MENU ORANGE MONEY PRODUCTION === 🍊');
  console.log('1. 💳 Effectuer un paiement RÉEL');
  console.log('2. 🔍 Vérifier le statut d\'une transaction');
  console.log('3. 🚪 Quitter');
}

async function bootstrap() {
  console.log('🍊 === TEST ORANGE MONEY PRODUCTION === 🍊');
  console.log('⚠️  ATTENTION: Ce script effectue de VRAIS paiements!');
  
  // Confirmation finale
  console.log('\n🚨 DERNIÈRE CONFIRMATION 🚨');
  const finalConfirm = await question('Vous allez effectuer des paiements Orange Money RÉELS. Tapez "JE COMPRENDS" pour continuer: ');
  
  if (finalConfirm.trim() !== 'JE COMPRENDS') {
    console.log('❌ Tests annulés - confirmation non reçue');
    rl.close();
    return;
  }
  
  while (true) {
    try {
      await showMenu();
      const choice = await question('\n🎯 Votre choix (1-3): ');
      
      switch (choice.trim()) {
        case '1':
          await testRealOrangeMoneyPayment();
          return; // Sortir après le paiement
        case '2':
          await checkOrangeMoneyTransaction();
          return; // Sortir après la vérification
        case '3':
          console.log('👋 Au revoir!');
          rl.close();
          return;
        default:
          console.log('❌ Choix invalide. Veuillez réessayer.');
      }
    } catch (error) {
      console.error('❌ Erreur:', error.message);
    }
  }
}

bootstrap().catch(console.error);




