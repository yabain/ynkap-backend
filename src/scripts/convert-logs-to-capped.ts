import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ConfigService } from '@nestjs/config';
import { MongoClient } from 'mongodb';

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
    
    console.log('Conversion de la collection logs en collection cappée...');
    // Masquer les identifiants dans l'URI pour l'affichage
    const maskedUri = mongoUri.includes('@') 
      ? mongoUri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@') 
      : mongoUri;
    console.log(`URI MongoDB: ${maskedUri}`);
    
    // Connexion directe à MongoDB
    const client = new MongoClient(mongoUri);
    // Suppression des options dépréciées dans les paramètres
    // { useNewUrlParser: true, useUnifiedTopology: true }
    await client.connect();
    
    // Extraire le nom de la base de données de l'URI
    let dbName;
    try {
      dbName = mongoUri.split('/').pop().split('?')[0];
    } catch (error) {
      console.log('Impossible d\'extraire le nom de la base de données de l\'URI, utilisation de "test"');
      dbName = 'test';
    }
    
    const db = client.db(dbName);
    
    // Vérifier si la collection logs existe
    const collections = await db.listCollections({ name: 'logs' }).toArray();
    
    if (collections.length > 0) {
      // Vérifier si la collection est déjà cappée
      const collInfo = await db.command({ collStats: 'logs' });
      
      if (collInfo.capped) {
        console.log('La collection logs est déjà une collection cappée.');
        console.log(`Taille maximale: ${collInfo.maxSize / (1024 * 1024)} Mo`);
      } else {
        // Convertir la collection en collection cappée
        // Taille maximale de 500 Mo
        const maxSizeBytes = 500 * 1024 * 1024;
        
        console.log('Conversion de la collection logs en collection cappée...');
        console.log(`Taille maximale: ${maxSizeBytes / (1024 * 1024)} Mo`);
        
        await db.command({
          convertToCapped: 'logs',
          size: maxSizeBytes
        });
        
        console.log('Conversion réussie!');
      }
    } else {
      // Créer une nouvelle collection cappée
      console.log('La collection logs n\'existe pas. Création d\'une nouvelle collection cappée...');
      
      // Taille maximale de 500 Mo
      const maxSizeBytes = 500 * 1024 * 1024;
      
      await db.createCollection('logs', {
        capped: true,
        size: maxSizeBytes
      });
      
      console.log('Collection logs créée avec succès!');
      console.log(`Taille maximale: ${maxSizeBytes / (1024 * 1024)} Mo`);
    }
    
    await client.close();
    await app.close();
    
    console.log('Opération terminée avec succès!');
  } catch (error) {
    console.error('Erreur lors de la conversion de la collection logs:', error);
    process.exit(1);
  }
}

bootstrap();
