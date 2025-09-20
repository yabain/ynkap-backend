/**
 * Script pour extraire les clés d'API d'une application
 * Exécuter avec: npx ts-node -r tsconfig-paths/register src/scripts/extract-app-keys.ts
 */

import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApplicationService } from '../application/services/application.services';
import * as readline from 'readline';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const applicationService = app.get(ApplicationService);
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    // Demander l'ID de l'application
    rl.question('Entrez l\'ID de l\'application : ', async (appId) => {
      try {
        // Récupérer l'application
        // Passer null pour la session et un objet vide pour select
        const application = await applicationService.findById(appId, null, {});
        
        if (!application) {
          console.error('Application non trouvée');
          await app.close();
          process.exit(1);
        }
        
        // Extraire les clés
        const appKeys = {
          name: application.name,
          production: {
            clientId: application.clientIdProd,
            privateKey: application.privateKeyProd,
            active: application.envProd
          },
          test: {
            clientId: application.clientIdTest,
            privateKey: application.privateKeyTest, // Correction de privateKeytest -> privateKeyTest
            active: application.envTest
          }
        };
        
        // Créer un fichier avec les clés
        const fileName = `app-keys-${application.name.replace(/\s+/g, '-').toLowerCase()}.json`;
        fs.writeFileSync(fileName, JSON.stringify(appKeys, null, 2));
        
        console.log(`\nClés d'API extraites avec succès dans le fichier ${fileName}`);
        console.log('\nATTENTION: Ce fichier contient des informations sensibles.');
        console.log('Partagez-le de manière sécurisée et supprimez-le après utilisation.\n');
        
        // Afficher les clés dans la console
        console.log('=== CLÉS D\'API POUR L\'APPLICATION ===');
        console.log(`Nom: ${appKeys.name}`);
        console.log('\nEnvironnement de test:');
        console.log(`Client ID: ${appKeys.test.clientId}`);
        console.log(`Private Key: ${appKeys.test.privateKey}`);
        console.log(`Actif: ${appKeys.test.active}`);
        console.log('\nEnvironnement de production:');
        console.log(`Client ID: ${appKeys.production.clientId}`);
        console.log(`Private Key: ${appKeys.production.privateKey}`);
        console.log(`Actif: ${appKeys.production.active}`);
        console.log('=======================================');
        
        await app.close();
        process.exit(0);
      } catch (error) {
        console.error('Erreur lors de l\'extraction des clés:', error.message);
        await app.close();
        process.exit(1);
      }
    });
  } catch (error) {
    console.error('Erreur:', error.message);
    await app.close();
    process.exit(1);
  }
}

bootstrap();

