import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApplicationService } from '../application/services/application.services';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function bootstrap() {
  console.log('🔑 Génération des clés de test pour application...');
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const applicationService = app.get(ApplicationService);
  
  try {
    const appId = await new Promise<string>((resolve) => {
      rl.question('Entrez l\'ID de l\'application : ', resolve);
    });
    
    console.log('🔄 Génération des nouvelles clés de test...');
    
    const result = await applicationService.generateApiKeys(appId, 'test');
    
    console.log('\n✅ Clés de test générées avec succès !');
    console.log(`Client ID: ${result.clientIdTest}`);
    console.log(`Private Key: ${result.privateKeyTest}`);
    console.log('\n💾 Clés sauvegardées en base de données');
    
  } catch (error) {
    console.error('❌ Erreur:', error.message);
  } finally {
    rl.close();
    await app.close();
  }
}

bootstrap();