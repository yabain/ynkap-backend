/**
 * Script pour vérifier les transactions dans la base de données
 * Exécuter avec: npx ts-node -r tsconfig-paths/register src/scripts/check-transactions.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FinancialTransactionService } from '../financial-transaction/services';
import { MongoClient } from 'mongodb';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const financialTransactionService = app.get(FinancialTransactionService);
    const configService = app.get(ConfigService);
    
    console.log('Vérification des transactions via le service...');
    
    // Récupérer les 10 dernières transactions via le service
    const transactions = await financialTransactionService.getAllTransactions({});
    
    console.log(`${transactions.length} transactions trouvées via le service.`);
    
    if (transactions.length > 0) {
      console.log('Dernière transaction:');
      console.log(JSON.stringify(transactions[0], null, 2));
    }
    
    // Vérifier directement via MongoDB
    console.log('\nVérification directe via MongoDB...');

    // Essayer différentes variables d'environnement pour l'URI MongoDB
    let mongoUri = configService.get<string>('MONGODB_URI');
    if (!mongoUri) {
      mongoUri = configService.get<string>('MONGO_DATABASE_URL');
    }
    if (!mongoUri) {
      mongoUri = process.env.MONGODB_URI || process.env.MONGO_DATABASE_URL;
    }

    console.log('URI MongoDB:', mongoUri ? mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') : 'Non définie');

    if (!mongoUri) {
      console.error('URI MongoDB non définie. Vérifiez vos variables d\'environnement.');
      await app.close();
      process.exit(1);
      return;
    }

    const client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db();
    const collections = await db.listCollections().toArray();
    
    console.log('Collections dans la base de données:');
    collections.forEach(collection => {
      console.log(`- ${collection.name}`);
    });
    
    // Trouver la collection des transactions
    const transactionCollections = collections.filter(c => 
      c.name.toLowerCase().includes('transaction') || 
      c.name.toLowerCase().includes('financial')
    );
    
    if (transactionCollections.length === 0) {
      console.log('Aucune collection de transactions trouvée!');
    } else {
      console.log(`Collection de transactions: ${transactionCollections[0].name}`);
      
      const collection = db.collection(transactionCollections[0].name);
      const count = await collection.countDocuments({});
      console.log(`Nombre de documents dans la collection: ${count}`);
      
      if (count > 0) {
        const latestTransactions = await collection.find({}).sort({ createdAt: -1 }).limit(10).toArray();
        console.log('10 dernières transactions:');
        latestTransactions.forEach((t, i) => {
          console.log(`${i+1}. ID: ${t._id}, Ref: ${t.ref}, Amount: ${t.amount}, State: ${t.state}`);
        });
      }
    }
    
    await client.close();
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la vérification des transactions:', error);
    process.exit(1);
  }
}

bootstrap();

