/**
 * Script pour générer les clés MTN Money pour la production
 * Exécuter avec: npm run generate:mtn-prod-keys
 */

import * as dotenv from 'dotenv';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { v4 as uuidv4 } from 'uuid';
import { lastValueFrom } from 'rxjs';
import * as fs from 'fs';
import * as readline from 'readline';

async function confirmProduction(): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    rl.question('⚠️  You are about to generate PRODUCTION API keys. Are you sure? (yes/no): ', (answer) => {
      rl.close();
      resolve(answer.toLowerCase() === 'yes');
    });
  });
}

async function bootstrap() {
  console.log('🚨 MTN MONEY PRODUCTION KEY GENERATION 🚨');
  console.log('WARNING: This will create production API keys.');
  
  const confirmed = await confirmProduction();
  if (!confirmed) {
    console.log('❌ Operation cancelled by user');
    process.exit(0);
  }
  
  // Charger le fichier .env.prod
  dotenv.config({ path: '.env.prod' });
  
  const app = await NestFactory.createApplicationContext(AppModule);
  const httpService = app.get(HttpService);
  const configService = app.get(ConfigService);
  
  try {
    console.log('🔑 Generating MTN Money API keys for PRODUCTION...');
    
    // Vérifier les variables d'environnement requises - CORRIGÉ
    const primaryKey = process.env.MOMO_API_PRIMARY_KEY || process.env.MTN_PROD_PRIMARY_KEY;
    
    if (!primaryKey) {
      console.error('❌ Variables manquantes. Vérifiez votre .env.prod:');
      console.error('   - MOMO_API_PRIMARY_KEY (requis)');
      console.error('   - PROD_CALLBACK_HOST (optionnel)');
      throw new Error('MOMO_API_PRIMARY_KEY environment variable is required');
    }
    
    console.log('✅ Primary key found:', primaryKey.substring(0, 8) + '...');
    
    // Utiliser le bon endpoint de production
    const prodApiPath = 'https://api.mtn.com/v1_0';
    console.log(`📡 Using PRODUCTION endpoint: ${prodApiPath}`);
    
    // 1. Générer un UUID pour l'utilisateur API
    const uuid = uuidv4();
    console.log(`🆔 Generated UUID: ${uuid}`);
    
    // 2. Créer l'utilisateur API
    console.log('👤 Creating PRODUCTION API user...');
    console.log('🔍 Request details:');
    console.log(`   URL: ${prodApiPath}/apiuser`);
    console.log(`   UUID: ${uuid}`);
    console.log(`   Primary Key: ${primaryKey.substring(0, 8)}...`);
    
    try {
      const createUserResponse = await lastValueFrom(httpService.request({
        url: `${prodApiPath}/apiuser`,
        method: 'post',
        headers: {
          'X-Reference-Id': uuid,
          'Ocp-Apim-Subscription-Key': primaryKey,
          'Content-Type': 'application/json'
        },
        data: {
          providerCallbackHost: process.env.PROD_CALLBACK_HOST || 'https://your-production-domain.com/api/mtn-callback'
        },
        timeout: 30000,
        validateStatus: () => true
      }));
      
      console.log('📊 Create user response status:', createUserResponse.status);
      console.log('📊 Create user response data:', createUserResponse.data);
      
      if (createUserResponse.status === 201) {
        console.log('✅ PRODUCTION API User created successfully');
      } else if (createUserResponse.status === 409) {
        console.log('⚠️  PRODUCTION API User already exists, continuing...');
      } else {
        console.error('❌ Unexpected response:', createUserResponse.status, createUserResponse.data);
        throw new Error(`Failed to create API user: ${createUserResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Error creating PRODUCTION API user:', error.response?.status, error.response?.statusText);
      console.error('Error details:', error.response?.data);
      throw error;
    }
    
    // 3. Créer la clé API
    console.log('🔐 Generating PRODUCTION API key...');
    
    const apiKeyResponse = await lastValueFrom(httpService.request({
      url: `${prodApiPath}/apiuser/${uuid}/apikey`,
      method: 'post',
      headers: {
        'Ocp-Apim-Subscription-Key': primaryKey
      },
      timeout: 30000
    }));
    
    const apiKey = apiKeyResponse.data.apiKey;
    
    // 4. Sauvegarder les clés dans un fichier sécurisé
    const credentials = {
      environment: 'production',
      uuid,
      apiKey,
      generatedAt: new Date().toISOString(),
      apiPath: prodApiPath,
      warning: 'PRODUCTION CREDENTIALS - HANDLE WITH EXTREME CARE'
    };
    
    const fileName = `mtn-prod-credentials-${Date.now()}.json`;
    fs.writeFileSync(fileName, JSON.stringify(credentials, null, 2), { mode: 0o600 });
    
    console.log('\n🎉 === MTN MONEY PRODUCTION API CREDENTIALS ===');
    console.log(`UUID: ${uuid}`);
    console.log(`API Key: ${apiKey}`);
    console.log(`\n📝 Add these to your .env.prod file:`);
    console.log(`MOMO_API_DEFAULT_UUID=${uuid}`);
    console.log(`MOMO_API_KEY=${apiKey}`);
    console.log(`\n💾 Credentials saved to: ${fileName}`);
    console.log('🔒 File permissions set to 600 (owner read/write only)');
    console.log('\n⚠️  SECURITY REMINDER:');
    console.log('- Store these credentials securely');
    console.log('- Delete the JSON file after copying to .env.prod');
    console.log('- Never commit production credentials to version control');
    console.log('===============================\n');
    
  } catch (error) {
    console.error('❌ Error generating MTN Money PRODUCTION API keys:', error.response?.data || error.message);
    process.exit(1);
  } finally {
    await app.close();
  }
}

bootstrap();






