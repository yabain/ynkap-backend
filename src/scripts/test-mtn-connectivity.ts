/**
 * Script pour tester la connectivité avec l'API MTN Money
 * Exécuter avec: npx cross-env NODE_ENV=prod ts-node -r tsconfig-paths/register src/scripts/test-mtn-connectivity.ts
 */

import axios from 'axios';
import * as dotenv from 'dotenv';

// Charger les variables d'environnement en fonction de NODE_ENV
const envFile = process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev';
console.log(`Loading environment from ${envFile}`);
dotenv.config({ path: envFile });

async function testConnectivity() {
  console.log('=== MTN Money API Connectivity Test ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('API Path:', process.env.MOMO_API_PATH);
  
  // Tester la connectivité de base
  try {
    console.log('\nTesting basic connectivity...');
    const response = await axios.get(`${process.env.MOMO_API_PATH}`, {
      validateStatus: () => true // Accepter tous les codes de statut
    });
    console.log('Response status:', response.status);
    console.log('Response headers:', response.headers);
  } catch (error) {
    console.error('Error testing basic connectivity:', error.message);
  }
  
  // Tester avec la clé primaire
  try {
    console.log('\nTesting with primary key...');
    const primaryKey = process.env.NODE_ENV === 'prod' 
      ? process.env.MTN_PROD_PRIMARY_KEY 
      : process.env.MOMO_API_PRIMARY_KEY;
    
    console.log('Using primary key:', primaryKey ? 'Key is set' : 'Key is NOT set');
    
    const response = await axios.get(`${process.env.MOMO_API_PATH}/v1_0/apiuser`, {
      headers: {
        'Ocp-Apim-Subscription-Key': primaryKey
      },
      validateStatus: () => true // Accepter tous les codes de statut
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.error('Error testing with primary key:', error.message);
  }
}

testConnectivity().catch(console.error);