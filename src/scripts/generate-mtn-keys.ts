/**
 * Script pour générer les clés MTN Money pour le développement
 * Exécuter avec: npm run generate:mtn-keys
 */

import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { v4 as uuidv4 } from 'uuid';
import { lastValueFrom } from 'rxjs';
import * as fs from 'fs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const httpService = app.get(HttpService);
  const configService = app.get(ConfigService);
  
  try {
    console.log('🔑 Generating MTN Money API keys for DEVELOPMENT...');
    
    // Vérifier les variables d'environnement requises
    const primaryKey = configService.get<string>('MOMO_API_PRIMARY_KEY');
    const apiPath = configService.get<string>('MOMO_API_PATH');
    
    if (!primaryKey) {
      throw new Error('MOMO_API_PRIMARY_KEY is not configured');
    }
    
    if (!apiPath) {
      throw new Error('MOMO_API_PATH is not configured');
    }
    
    console.log(`📡 Using API endpoint: ${apiPath}`);
    
    // 1. Générer un UUID pour l'utilisateur API
    const uuid = uuidv4();
    console.log(`🆔 Generated UUID: ${uuid}`);
    
    // 2. Créer l'utilisateur API
    console.log('👤 Creating API user...');
    
    try {
      await lastValueFrom(httpService.request({
        url: `${apiPath}/v1_0/apiuser`,
        method: 'post',
        headers: {
          'X-Reference-Id': uuid,
          'Ocp-Apim-Subscription-Key': primaryKey,
          'Content-Type': 'application/json'
        },
        data: {
          providerCallbackHost: configService.get<string>('CALLBACK_HOST') || 'https://your-callback-url.com'
        },
        timeout: 30000
      }));
      
      console.log('✅ API User created successfully');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('⚠️  API User already exists, continuing...');
      } else {
        console.error('❌ Error creating API user:', error.response?.status, error.response?.statusText);
        throw error;
      }
    }
    
    // 3. Créer la clé API
    console.log('🔐 Generating API key...');
    
    const apiKeyResponse = await lastValueFrom(httpService.request({
      url: `${apiPath}/v1_0/apiuser/${uuid}/apikey`,
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': primaryKey
      },
      timeout: 30000
    }));
    
    const apiKey = apiKeyResponse.data.apiKey;
    
    // 4. Sauvegarder les clés dans un fichier
    const credentials = {
      environment: 'development',
      uuid,
      apiKey,
      generatedAt: new Date().toISOString(),
      apiPath
    };
    
    const fileName = `mtn-dev-credentials-${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(credentials, null, 2));
    
    console.log('\n🎉 === MTN MONEY DEVELOPMENT API CREDENTIALS ===');
    console.log(`UUID: ${uuid}`);
    console.log(`API Key: ${apiKey}`);
    console.log(`\n📝 Add these to your .env.dev file:`);
    console.log(`MOMO_API_DEFAULT_UUID=${uuid}`);
    console.log(`MOMO_API_KEY=${apiKey}`);
    console.log(`\n💾 Credentials saved to: ${fileName}`);
    console.log('===============================\n');
    
  } catch (error) {
    console.error('❌ Error generating MTN Money API keys:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();

