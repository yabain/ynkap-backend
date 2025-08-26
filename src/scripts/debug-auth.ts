import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { ApplicationKeyService } from '../application/services/application-key.service';
import { ApplicationAuthService } from '../application/services/application-auth.service';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ApplicationKey, ApplicationKeyDocument } from '../application/models/application-key.schema';
import * as bcrypt from 'bcrypt';

async function debugAuth() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const authService = app.get(ApplicationAuthService);
  
  const clientId = '77bc0e36-886b-4858-89bd-29dce0bf9272';
  const privateKey = '0faba57517905e0da54b14a0b3625382b0ca9eb0bf89130ba78c65201b5c6b80';
  
  console.log('🔍 Diagnostic d\'authentification...\n');
  
  try {
    // Simuler une requête
    const mockReq = {
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
      get: () => 'test-user-agent'
    };
    
    console.log('🔄 Test de validation complète...');
    const result = await authService.validateApplication(clientId, privateKey, mockReq);
    
    console.log('✅ Authentification réussie !');
    console.log('Application:', result.application.name);
    console.log('Environnement:', result.environment);
    console.log('Client ID:', result.applicationKey.clientId);
    
  } catch (error) {
    console.log('❌ Erreur d\'authentification:', error.message);
    
    // Diagnostic plus détaillé
    console.log('\n🔍 Diagnostic détaillé...');
    console.log('Client ID utilisé:', clientId);
    console.log('Private Key utilisé:', privateKey.substring(0, 10) + '...');
    
    if (error.message.includes('Client ID not found')) {
      console.log('💡 Solution: Générez les clés avec: npm run generate:app-test-keys');
    } else if (error.message.includes('Invalid private key')) {
      console.log('💡 Solution: Vérifiez que la clé privée est correcte');
    } else if (error.message.includes('expired')) {
      console.log('💡 Solution: Régénérez les clés expirées');
    }
  }
  
  await app.close();
}

debugAuth();
