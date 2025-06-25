/**
 * Script pour tester les routes MTN Money
 * Exécuter avec: npm run test:mtn-routes
 */

import axios from 'axios';
import * as readline from 'readline';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

// Charger les variables d'environnement
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
// Essayer également .env.dev si .env n'existe pas
if (!process.env.KEYCLOAK_SERVER_URI && fs.existsSync(path.resolve(__dirname, '../../.env.dev'))) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.dev') });
}

// Fonction utilitaire pour les questions
function createInterface() {
  return readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
}

// Fonction pour poser une question et obtenir une réponse
function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

// Fonction pour obtenir un token automatiquement
async function getTokenAutomatically(): Promise<string> {
  try {
    console.log('Tentative d\'authentification automatique...');
    
    // Vérifier si les variables d'environnement nécessaires sont définies
    if (!process.env.KEYCLOAK_SERVER_URI || !process.env.KEYCLOAK_SERVER_REALM || 
        !process.env.KEYCLOAK_SERVER_CLIENTID || !process.env.KEYCLOAK_SERVER_SECRET) {
      console.log('Variables d\'environnement Keycloak manquantes. Tentative avec les valeurs par défaut...');
    }
    
    // Utiliser les valeurs par défaut si les variables d'environnement ne sont pas définies
    const keycloakUri = process.env.KEYCLOAK_SERVER_URI || 'http://localhost:8080/auth';
    const realm = process.env.KEYCLOAK_SERVER_REALM || 'master';
    const clientId = process.env.KEYCLOAK_SERVER_CLIENTID || 'admin-cli';
    const clientSecret = process.env.KEYCLOAK_SERVER_SECRET || '';
    
    // Utiliser l'authentification client_credentials pour obtenir un token
    const keycloakUrl = `${keycloakUri}/realms/${realm}/protocol/openid-connect/token`;
    
    const params = new URLSearchParams();
    params.append('grant_type', 'client_credentials');
    params.append('client_id', clientId);
    
    if (clientSecret) {
      params.append('client_secret', clientSecret);
    }
    
    const response = await axios.post(keycloakUrl, params);
    
    console.log('Token obtenu avec succès!');
    return response.data.access_token;
  } catch (error) {
    console.error('Erreur lors de l\'authentification automatique:', error.response?.data || error.message);
    console.log('Impossible d\'obtenir un token automatiquement. Tentative sans authentification...');
    return '';
  }
}

// Fonction pour créer un client axios avec ou sans authentification
async function createAuthenticatedClient(): Promise<any> {
  // Essayer d'obtenir un token automatiquement
  const token = await getTokenAutomatically();
  
  if (token) {
    console.log('Client configuré avec authentification.');
    return axios.create({
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } else {
    console.log('Client configuré sans authentification.');
    return axios.create();
  }
}

async function bootstrap() {
  try {
    console.log('Utilisation de l\'application déjà en cours d\'exécution sur le port 3000');
    
    // Créer un client axios avec ou sans authentification
    const client = await createAuthenticatedClient();
    
    const baseUrl = 'http://localhost:3000/mtn-test';
    const rl = createInterface();

    console.log('\n=== TEST DES ROUTES MTN MONEY ===');
    
    let exit = false;
    
    while (!exit) {
      console.log('\nMenu principal:');
      console.log('1. Créer un utilisateur API MTN');
      console.log('2. Tester un dépôt MTN');
      console.log('3. Vérifier le statut d\'une transaction');
      console.log('4. Tester un retrait MTN');
      console.log('5. Vérifier le statut d\'un retrait');
      console.log('6. Annuler une transaction');
      console.log('7. Quitter');
      
      const choice = await question(rl, '\nChoisissez une option (1-7): ');
      
      switch (choice) {
        case '1':
          await createApiUser(baseUrl, client);
          break;
        case '2':
          await testDeposit(baseUrl, rl, client);
          break;
        case '3':
          await checkTransaction(baseUrl, rl, client);
          break;
        case '4':
          await testWithdrawal(baseUrl, rl, client);
          break;
        case '5':
          await checkWithdrawal(baseUrl, rl, client);
          break;
        case '6':
          await cancelTransaction(baseUrl, rl, client);
          break;
        case '7':
          exit = true;
          break;
        default:
          console.log('Option invalide. Veuillez réessayer.');
      }
    }
    
    rl.close();
    console.log('\nTests terminés.');
    process.exit(0);
    
  } catch (error) {
    console.error('Erreur lors de l\'exécution des tests:', error);
    process.exit(1);
  }
}

async function createApiUser(baseUrl: string, client: any) {
  try {
    console.log('\nCréation d\'un utilisateur API MTN...');
    const response = await client.post(`${baseUrl}/create-api-user`);
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function testDeposit(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const phoneNumber = await question(rl, 'Numéro de téléphone (ex: 237671162552): ');
    const amount = parseInt(await question(rl, 'Montant (ex: 100): '), 10);
    const description = await question(rl, 'Description (optionnel): ');
    
    console.log('\nInitiation du dépôt MTN Money...');
    const response = await client.post(`${baseUrl}/test-deposit`, {
      phoneNumber,
      amount,
      description: description || 'Test deposit'
    });
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.transactionRef) {
      console.log('\nRéférence de transaction à conserver pour vérification ultérieure:');
      console.log(response.data.data.transactionRef);
    }
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function checkTransaction(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const ref = await question(rl, 'Référence de la transaction: ');
    
    console.log('\nVérification du statut de la transaction...');
    const response = await client.get(`${baseUrl}/check-transaction?ref=${ref}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function testWithdrawal(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const phoneNumber = await question(rl, 'Numéro de téléphone (ex: 237671162552): ');
    const amount = parseInt(await question(rl, 'Montant (ex: 100): '), 10);
    const description = await question(rl, 'Description (optionnel): ');
    
    console.log('\nInitiation du retrait MTN Money...');
    const response = await client.post(`${baseUrl}/test-withdrawal`, {
      phoneNumber,
      amount,
      description: description || 'Test withdrawal'
    });
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data.transactionRef) {
      console.log('\nRéférence de transaction à conserver pour vérification ultérieure:');
      console.log(response.data.data.transactionRef);
    }
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function checkWithdrawal(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const ref = await question(rl, 'Référence du retrait: ');
    
    console.log('\nVérification du statut du retrait...');
    const response = await client.get(`${baseUrl}/check-withdrawal?ref=${ref}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function cancelTransaction(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const ref = await question(rl, 'Référence de la transaction à annuler: ');
    
    console.log('\nAnnulation de la transaction...');
    const response = await client.post(`${baseUrl}/cancel-transaction?ref=${ref}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

bootstrap();



