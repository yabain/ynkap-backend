/**
 * Script pour tester les méthodes de paiement
 * Exécuter avec: npx ts-node -r tsconfig-paths/register src/scripts/test-payment-methods.ts
 */

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { OrangeMoneyStrategyPayment } from '../financial-payment/strategies/orange-money/orange-money.strategy';
import { MtnMoneyStrategyPayment } from '../financial-payment/strategies/mtn-money/mtn-money.strategy';
import { FinancialTransactionState } from '../financial-transaction/enum';
import { FinancialTransactionType } from '../financial-payment/enum';
import { v4 as uuidv4 } from 'uuid';
import { getModelToken } from '@nestjs/mongoose';
import { FinancialTransaction } from '../financial-transaction/models';
import { Model } from 'mongoose';
import { PaymentMoneyCode } from '../financial-payment/enum';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const httpService = app.get(HttpService);
    const configService = app.get(ConfigService);
    
    // Obtenir le modèle FinancialTransaction depuis le contexte NestJS
    const FinancialTransactionModel = app.get<Model<FinancialTransaction>>(
      getModelToken(FinancialTransaction.name)
    );
    
    console.log('Testing payment methods...');
    
    // Créer une transaction de test en utilisant le modèle Mongoose
    const transaction = new FinancialTransactionModel({
      _id: uuidv4(),
      ref: uuidv4(),
      amount: 100,
      phoneNumber: '237671162552', // Numéro de téléphone de test
      description: 'Test payment',
      type: FinancialTransactionType.DEPOSIT,
      state: FinancialTransactionState.FINANCIAL_TRANSACTION_START,
      userRef: { account: '237671162552', name: 'Ulrich Waba' },
      moneyCode: PaymentMoneyCode.XAF,
      startDate: new Date(),
      endDate: new Date(),
      raison: 'Test payment'
    });
    
    // Initialiser les stratégies de paiement
    const orangeMoneyStrategy = new OrangeMoneyStrategyPayment(configService, httpService);
    const mtnMoneyStrategy = new MtnMoneyStrategyPayment(httpService, configService);
    
    // Tester Orange Money
    console.log('\n=== Testing Orange Money ===');
    console.log('Transaction:', JSON.stringify(transaction.toJSON(), null, 2));
    
    try {
      console.log('Getting Orange Money token...');
      const omToken = await orangeMoneyStrategy.getToken();
      console.log('Orange Money token:', omToken ? (omToken.substring(0, 10) + '...') : 'No token received');
      
      console.log('Initiating Orange Money payment...');
      const omResult = await orangeMoneyStrategy.buy(transaction);
      console.log('Orange Money payment result:', omResult);
    } catch (error) {
      console.error('Orange Money test failed:', error.message);
      if (error.stack) console.error(error.stack);
    }
    
    // Tester MTN Money
    console.log('\n=== Testing MTN Money ===');
    console.log('Transaction:', JSON.stringify(transaction.toJSON(), null, 2));
    
    try {
      console.log('Initiating MTN Money payment...');
      const mtnResult = await mtnMoneyStrategy.buy(transaction);
      console.log('MTN Money payment result:', mtnResult);
    } catch (error) {
      console.error('MTN Money test failed:', error.message);
      if (error.stack) console.error(error.stack);
    }
    
    await app.close();
  } catch (error) {
    console.error('Error testing payment methods:', error.message);
    if (error.stack) console.error(error.stack);
  }
}

bootstrap();



