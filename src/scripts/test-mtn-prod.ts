/**
 * Script pour tester MTN Money en production
 * Exécuter avec: NODE_ENV=prod npm run test:mtn-prod
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MtnMoneyStrategyPayment } from '../financial-payment/strategies/mtn-money/mtn-money.strategy';
import { FinancialTransaction } from '../financial-transaction/models';
import { FinancialTransactionType } from '../financial-payment/enum';
import { FinancialTransactionErrorType } from '../financial-transaction/enum/transaction.enum';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import mongoose from 'mongoose';

async function bootstrap() {
  console.log('=== MTN MONEY PRODUCTION TEST ===');
  console.log('Environment:', process.env.NODE_ENV);
  
  if (process.env.NODE_ENV !== 'prod') {
    console.error('This script should only be run in production mode!');
    console.error('Use: NODE_ENV=prod npm run test:mtn-prod');
    process.exit(1);
  }
  
  console.log('WARNING: This will create real transactions in the production environment.');
  console.log('Press Ctrl+C to cancel within 5 seconds...');
  
  // Attendre 5 secondes pour permettre l'annulation
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const mtnStrategy = app.get(MtnMoneyStrategyPayment);
  const configService = app.get(ConfigService);
  
  console.log('MTN API Path:', configService.get('MOMO_API_PATH'));
  console.log('MTN API Mode:', configService.get('MOMO_API_MODE_ENV'));
  
  try {
    // Créer une transaction de test avec un petit montant
    const testTransaction = {
      _id: uuidv4(),
      ref: uuidv4(),
      amount: 100, // Montant minimal pour tester
      phoneNumber: '671162552', // Remplacer par un numéro de test valide
      type: 'deposit', // Utiliser une chaîne directement si l'enum pose problème
      description: 'Test production MTN Money',
      // Ajout des propriétés manquantes
      state: 'financial_transaction_start',
      startDate: new Date(),
      endDate: new Date(),
      raison: 'Test production MTN Money',
      moneyCode: 'XAF',
      error: 0, // NO_ERROR
      token: '',
      paymentMode: 'mtn_money',
      userRef: { account: '671162552', name: ' Waba ulrich' },
      // Ajout des propriétés manquantes pour le document Mongoose
      application: new mongoose.Types.ObjectId(), // Ou une valeur réelle si disponible
      wallet: new mongoose.Types.ObjectId(), // Ou une valeur réelle si disponible
      createdAt: new Date()
    } as unknown as FinancialTransaction; // Double cast pour éviter l'erreur TypeScript
    
    console.log('Test transaction:', testTransaction);
    
    // Tester l'obtention du token
    console.log('Testing token acquisition...');
    const uuid = configService.get<string>('MOMO_API_DEFAULT_UUID');
    const token = await mtnStrategy['getToken'](uuid);
    console.log('Token obtained:', token ? 'Yes' : 'No');
    
    // Tester un paiement
    console.log('Testing payment...');
    const paymentResult = await mtnStrategy.buy(testTransaction);
    console.log('Payment result:', paymentResult);
    
    // Vérifier le statut
    if (paymentResult && paymentResult.ref) {
      console.log('Checking transaction status...');
      testTransaction.ref = paymentResult.ref;
      
      // Attendre 10 secondes avant de vérifier
      await new Promise(resolve => setTimeout(resolve, 10000));
      
      const statusResult = await mtnStrategy.check(testTransaction);
      console.log('Status result:', statusResult);
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  } finally {
    await app.close();
  }
}

bootstrap();






