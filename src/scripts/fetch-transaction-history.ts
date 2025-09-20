import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FinancialTransactionService } from '../financial-transaction/services';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement directement
dotenv.config();

async function bootstrap() {
  try {
    // Créer le contexte de l'application NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Récupérer le service des transactions financières
    const financialTransactionService = app.get(FinancialTransactionService);
    
    // Récupérer la configuration pour accéder directement à MongoDB
    const configService = app.get(ConfigService);
    let mongoUri = configService.get<string>('MONGO_DATABASE_URL');
    
    // Si mongoUri est undefined, essayer de le récupérer directement depuis process.env
    if (!mongoUri) {
      console.log('MONGO_DATABASE_URL non trouvée via ConfigService, tentative de récupération directe...');
      mongoUri = process.env.MONGO_DATABASE_URL;
      
      if (!mongoUri) {
        console.error('MONGO_DATABASE_URL non trouvée. Veuillez vérifier votre fichier .env');
        console.log('Tentative avec la valeur codée en dur...');
        mongoUri = 'mongodb+srv://ypay:sISkZDwDqbYRM2dz@cluster0.v0j9gar.mongodb.net/?retryWrites=true&w=majority';
      }
    }
    
    console.log('Connexion à MongoDB...');
    // Masquer les identifiants dans l'URI pour l'affichage
    const maskedUri = mongoUri.includes('@') 
      ? mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') 
      : mongoUri;
    console.log(`URI MongoDB: ${maskedUri}`);
    
    // Connexion directe à MongoDB
    const client = new MongoClient(mongoUri);
    await client.connect();
    
    // Extraire le nom de la base de données de l'URI
    let dbName;
    try {
      dbName = mongoUri.split('/').pop().split('?')[0];
    } catch (error) {
      console.log('Impossible d\'extraire le nom de la base de données de l\'URI, utilisation de "test"');
      dbName = 'test';
    }
    
    console.log(`Nom de la base de données: ${dbName}`);
    const db = client.db(dbName);
    
    // Vérifier les collections disponibles
    console.log('\nCollections disponibles:');
    const collections = await db.listCollections().toArray();
    
    if (collections.length === 0) {
      console.log('Aucune collection trouvée dans la base de données!');
      await client.close();
      await app.close();
      return;
    }
    
    collections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name}`);
    });
    
    // Chercher la collection des transactions
    const transactionCollections = collections.filter(c => 
      c.name.toLowerCase().includes('transaction') || 
      c.name.toLowerCase().includes('payment') ||
      c.name.toLowerCase().includes('financial')
    );
    
    if (transactionCollections.length === 0) {
      console.log('\nAucune collection de transactions trouvée!');
      
      // Examiner toutes les collections pour trouver des documents qui pourraient être des transactions
      console.log('\nRecherche de documents de transaction dans toutes les collections...');
      
      for (const collection of collections) {
        console.log(`\nExamen de la collection: ${collection.name}`);
        
        const coll = db.collection(collection.name);
        const count = await coll.countDocuments({});
        console.log(`Nombre total de documents: ${count}`);
        
        if (count > 0) {
          // Vérifier si les documents ressemblent à des transactions
          const sample = await coll.findOne({});
          const keys = Object.keys(sample);
          
          // Vérifier si les champs typiques d'une transaction sont présents
          const transactionFields = ['amount', 'state', 'paymentMode', 'ref', 'type'];
          const matchingFields = transactionFields.filter(field => keys.includes(field));
          
          if (matchingFields.length >= 2) {
            console.log(`Cette collection pourrait contenir des transactions (${matchingFields.length} champs correspondants)`);
            console.log('Structure d\'un document:');
            console.log(keys.join(', '));
            
            // Afficher quelques exemples
            console.log('\nAperçu des 3 premiers documents:');
            const samples = await coll.find({}).limit(3).toArray();
            console.log(JSON.stringify(samples, null, 2));
            
            // Utiliser cette collection pour la suite
            transactionCollections.push(collection);
          }
        }
      }
      
      if (transactionCollections.length === 0) {
        console.log('Aucune collection de transactions identifiée.');
        await client.close();
        await app.close();
        return;
      }
    }
    
    console.log('\nCollections de transactions identifiées:');
    transactionCollections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name}`);
    });
    
    // Utiliser la première collection de transactions trouvée
    const collectionName = transactionCollections[0].name;
    console.log(`\nUtilisation de la collection: ${collectionName}`);
    
    const collection = db.collection(collectionName);
    const count = await collection.countDocuments({});
    console.log(`Nombre de documents dans la collection: ${count}`);
    
    if (count === 0) {
      console.log('Aucun document dans la collection sélectionnée.');
      await client.close();
      await app.close();
      return;
    }
    
    // Afficher quelques documents pour vérification
    console.log('\nAperçu des 3 premiers documents:');
    const samples = await collection.find({}).limit(3).toArray();
    console.log(JSON.stringify(samples, null, 2));
    
    console.log('\nRécupération des transactions via le service...');
    
    // Paramètres de filtrage (à modifier selon vos besoins)
    const filter = {};
    
    // Récupérer toutes les transactions
    const transactions = await financialTransactionService.findManyDocuments(filter);
    
    console.log(`${transactions.length} transactions trouvées via le service.`);
    
    // Si aucune transaction n'est trouvée via le service mais qu'il y en a dans la collection,
    // récupérer directement depuis MongoDB
    let formattedTransactions = [];
    
    if (transactions.length === 0 && count > 0) {
      console.log('Récupération directe depuis MongoDB...');
      const rawTransactions = await collection.find({}).toArray();
      
      formattedTransactions = rawTransactions.map(transaction => {
        return {
          id: transaction._id.toString(),
          reference: transaction.ref || transaction.reference || 'N/A',
          date: transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'N/A',
          application: transaction.application ? transaction.application.toString() : 'N/A',
          amount: `${transaction.amount || 0} ${transaction.moneyCode || 'XAF'}`,
          type: transaction.type || 'N/A',
          status: transaction.state || transaction.status || 'N/A',
          paymentMode: transaction.paymentMode || transaction.mode || 'N/A',
          user: transaction.userRef ? 
            `${transaction.userRef.fullName || 'N/A'} (${transaction.userRef.account || 'N/A'})` : 
            (transaction.user ? transaction.user.toString() : 'Inconnu'),
          reason: transaction.raison || transaction.reason || '-'
        };
      });
      
      console.log(`${formattedTransactions.length} transactions récupérées directement.`);
    } else {
      // Utiliser les transactions récupérées via le service
      formattedTransactions = transactions.map(transaction => {
        return {
          id: transaction._id.toString(),
          reference: transaction.ref || 'N/A',
          date: transaction.createdAt ? new Date(transaction.createdAt).toLocaleString() : 'N/A',
          application: transaction.application ? transaction.application.toString() : 'N/A',
          amount: `${transaction.amount || 0} ${transaction.moneyCode || 'XAF'}`,
          type: transaction.type || 'N/A',
          status: transaction.state || 'N/A',
          paymentMode: transaction.paymentMode || 'N/A',
          user: transaction.userRef ? 
            `${transaction.userRef.fullName || 'N/A'} (${transaction.userRef.account || 'N/A'})` : 'Inconnu',
          reason: transaction.raison || '-'
        };
      });
    }
    
    if (formattedTransactions.length === 0) {
      console.log('Aucune transaction trouvée.');
      await client.close();
      await app.close();
      return;
    }
    
    // Afficher les 5 premières transactions
    console.log('\nAperçu des transactions:');
    formattedTransactions.slice(0, 5).forEach((transaction, index) => {
      console.log(`\nTransaction ${index + 1}:`);
      console.log(`- ID: ${transaction.id}`);
      console.log(`- Référence: ${transaction.reference}`);
      console.log(`- Date: ${transaction.date}`);
      console.log(`- Application: ${transaction.application}`);
      console.log(`- Montant: ${transaction.amount}`);
      console.log(`- Type: ${transaction.type}`);
      console.log(`- Statut: ${transaction.status}`);
      console.log(`- Mode de paiement: ${transaction.paymentMode}`);
      console.log(`- Utilisateur: ${transaction.user}`);
      console.log(`- Raison: ${transaction.reason}`);
    });
    
    // Exporter les transactions en JSON
    const jsonFileName = `transaction_history_${new Date().toISOString().replace(/:/g, '-')}.json`;
    const jsonFilePath = path.join(process.cwd(), jsonFileName);
    
    fs.writeFileSync(jsonFilePath, JSON.stringify(formattedTransactions, null, 2));
    console.log(`\nFichier JSON créé: ${jsonFilePath}`);
    
    // Exporter les transactions en CSV
    const csvRows = [];
    
    // En-têtes CSV
    csvRows.push([
      'ID', 'Référence', 'Date', 'Application', 'Montant', 'Type', 
      'Statut', 'Mode de paiement', 'Utilisateur', 'Raison'
    ].join(','));
    
    // Données CSV
    formattedTransactions.forEach(transaction => {
      csvRows.push([
        transaction.id,
        transaction.reference,
        transaction.date,
        transaction.application,
        transaction.amount,
        transaction.type,
        transaction.status,
        transaction.paymentMode,
        transaction.user,
        transaction.reason
      ].map(value => `"${value}"`).join(','));
    });
    
    // Écrire le fichier CSV
    const csvContent = csvRows.join('\n');
    const csvFileName = `transaction_history_${new Date().toISOString().replace(/:/g, '-')}.csv`;
    const csvFilePath = path.join(process.cwd(), csvFileName);
    
    fs.writeFileSync(csvFilePath, csvContent);
    console.log(`Fichier CSV créé: ${csvFilePath}`);
    
    await client.close();
    await app.close();
    console.log('\nOpération terminée avec succès.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la récupération des historiques de transactions:', error);
    process.exit(1);
  }
}

bootstrap();









