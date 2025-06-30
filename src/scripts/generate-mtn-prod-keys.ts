/**
 * Script pour générer les clés MTN Money pour la production
 * Exécuter avec: npm run generate:mtn-prod-keys
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
    console.log('Generating MTN Money API keys for PRODUCTION...');
    console.log('WARNING: This will create production API keys. Make sure you are authorized to do this.');
    
    // 1. Générer un UUID pour l'utilisateur API
    const uuid = uuidv4();
    console.log('Generated UUID:', uuid);
    
    // 2. Créer l'utilisateur API
    console.log('Creating API user with URL:', `https://proxy.momoapi.mtn.com/v1_0/apiuser`);
    console.log('Using primary key:', process.env.MTN_PROD_PRIMARY_KEY ? 'Key is set' : 'Key is NOT set');

    try {
      await lastValueFrom(httpService.request({
        url: `https://proxy.momoapi.mtn.com/v1_0/apiuser`,
        method: 'post',
        headers: {
          'X-Reference-Id': uuid,
          'Ocp-Apim-Subscription-Key': process.env.MTN_PROD_PRIMARY_KEY || 'VOTRE_CLE_PRIMAIRE',
          'Content-Type': 'application/json'
        },
        data: {
          providerCallbackHost: 'https://votre-domaine.com/api/mtn-callback'
        }
      }));
      
      console.log('API User creation request sent successfully');
    } catch (error) {
      console.error('Error creating API user:', error.response?.status, error.response?.statusText);
      console.error('Error details:', error.response?.data);
      throw error;
    }
    
    console.log('API User created successfully');
    
    // 3. Créer la clé API
    const apiKeyResponse = await lastValueFrom(httpService.request({
      url: `https://proxy.momoapi.mtn.com/v1_0/apiuser/${uuid}/apikey`,
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': process.env.MTN_PROD_PRIMARY_KEY || 'VOTRE_CLE_PRIMAIRE'
      }
    }));
    
    const apiKey = apiKeyResponse.data.apiKey;
    
    console.log('\n=== MTN MONEY PRODUCTION API CREDENTIALS ===');
    console.log(`UUID: ${uuid}`);
    console.log(`API Key: ${apiKey}`);
    console.log('\nAdd these to your .env.prod file:');
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


