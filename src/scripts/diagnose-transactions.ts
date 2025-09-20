import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { MongoClient } from 'mongodb';
import { ConfigService } from '@nestjs/config';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement directement
dotenv.config();

async function bootstrap() {
  try {
    // Créer le contexte de l'application NestJS
    const app = await NestFactory.createApplicationContext(AppModule);
    
    // Récupérer la configuration
    const configService = app.get(ConfigService);
    let mongoUri = configService.get<string>('MONGO_DATABASE_URL');
    
    // Si mongoUri est undefined, essayer de le récupérer directement depuis process.env
    if (!mongoUri) {
      console.log('MONGO_DATABASE_URL non trouvée via ConfigService, tentative de récupération directe...');
      mongoUri = process.env.MONGO_DATABASE_URL;
      
      if (!mongoUri) {
        console.error('MONGO_DATABASE_URL non trouvée. Veuillez vérifier votre fichier .env');
        await app.close();
        process.exit(1);
        return;
      }
    }
    
    console.log('Diagnostic des transactions...');
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
    
    // Liste des collections
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
      c.name.toLowerCase().includes('payment')
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
          const transactionFields = ['amount', 'state', 'paymentMode', 'ref'];
          const matchingFields = transactionFields.filter(field => keys.includes(field));
          
          if (matchingFields.length >= 2) {
            console.log(`Cette collection pourrait contenir des transactions (${matchingFields.length} champs correspondants)`);
            console.log('Structure d\'un document:');
            console.log(keys.join(', '));
            
            // Afficher quelques exemples
            console.log('\nAperçu des 3 premiers documents:');
            const samples = await coll.find({}).limit(3).toArray();
            console.log(JSON.stringify(samples, null, 2));
          }
        }
      }
      
      await client.close();
      await app.close();
      return;
    }
    
    console.log('\nCollections de transactions identifiées:');
    transactionCollections.forEach((collection, index) => {
      console.log(`${index + 1}. ${collection.name}`);
    });
    
    // Examiner chaque collection de transactions
    for (const collection of transactionCollections) {
      console.log(`\nExamen de la collection: ${collection.name}`);
      
      const coll = db.collection(collection.name);
      const count = await coll.countDocuments({});
      console.log(`Nombre total de documents: ${count}`);
      
      if (count > 0) {
        // Vérifier la structure d'un document
        const sample = await coll.findOne({});
        console.log('Structure d\'un document:');
        console.log(Object.keys(sample).join(', '));
        
        // Vérifier si isDeleted existe et combien de documents ont isDeleted=true
        if ('isDeleted' in sample) {
          const deletedCount = await coll.countDocuments({ isDeleted: true });
          console.log(`Documents avec isDeleted=true: ${deletedCount}`);
          console.log(`Documents avec isDeleted=false: ${count - deletedCount}`);
        } else {
          console.log('Le champ isDeleted n\'existe pas dans cette collection');
        }
        
        // Afficher quelques exemples
        console.log('\nAperçu des 3 premiers documents:');
        const samples = await coll.find({}).limit(3).toArray();
        console.log(JSON.stringify(samples, null, 2));
      }
    }
    
    await client.close();
    await app.close();
    console.log('\nDiagnostic terminé.');
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du diagnostic:', error);
    process.exit(1);
  }
}

bootstrap();


