/**
 * Script pour générer les clés MTN Money pour le développement
 * Exécuter avec: npx ts-node -r tsconfig-paths/register src/scripts/generate-mtn-keys.ts
 */

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { v4 as uuidv4 } from 'uuid';
import { lastValueFrom } from 'rxjs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const httpService = app.get(HttpService);
  const configService = app.get(ConfigService);
  
  try {
    console.log('Generating MTN Money API keys for development...');
    
    // 1. Générer un UUID pour l'utilisateur API
    const uuid = uuidv4();
    console.log('Generated UUID:', uuid);
    
    // 2. Créer l'utilisateur API
    await lastValueFrom(httpService.request({
      url: `${configService.get<string>('MOMO_API_PATH')}/v1_0/apiuser`,
      method: 'post',
      headers: {
        'X-Reference-Id': uuid,
        'Ocp-Apim-Subscription-Key': configService.get<string>('MOMO_API_PRIMARY_KEY'),
        'Content-Type': 'application/json'
      },
      data: {
        providerCallbackHost: 'https://your-callback-url.com' // maiks je ne comprend pas encore cest qoui le collback
      }
    }));
    
    console.log('API User created successfully');
    
    // 3. Créer la clé API
    const apiKeyResponse = await lastValueFrom(httpService.request({
      url: `${configService.get<string>('MOMO_API_PATH')}/v1_0/apiuser/${uuid}/apikey`,
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': configService.get<string>('MOMO_API_PRIMARY_KEY')
      }
    }));
    
    const apiKey = apiKeyResponse.data.apiKey;
    
    console.log('\n=== MTN MONEY API CREDENTIALS ===');
    console.log(`UUID: ${uuid}`);
    console.log(`API Key: ${apiKey}`);
    console.log('\nAdd these to your .env.dev file:');
    console.log(`MOMO_API_DEFAULT_UUID=${uuid}`);
    console.log(`MOMO_API_KEY=${apiKey}`);
    console.log('===============================\n');
    
  } catch (error) {
    console.error('Error generating MTN Money API keys:', error.response?.data || error.message);
  } finally {
    await app.close();
  }
}

bootstrap();

