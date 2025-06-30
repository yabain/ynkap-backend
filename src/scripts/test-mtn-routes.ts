/**
 * Script pour tester les routes MTN Money
 * Exécuter avec: npm run test:mtn-routes
 */

import * as readline from 'readline';
import axios from 'axios';

// Fonction utilitaire pour poser une question et attendre la réponse
function question(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

async function bootstrap() {
  try {
    // Créer une interface readline pour l'interaction utilisateur
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Demander l'URL de base
    const defaultBaseUrl = 'http://localhost:3000/mtn-test';
    const baseUrlInput = await question(rl, `URL de base (défaut: ${defaultBaseUrl}): `);
    const baseUrl = baseUrlInput || defaultBaseUrl;
    
    console.log(`\nUtilisation de l'URL de base: ${baseUrl}`);
    
    // Créer un client axios
    const client = axios.create({
      baseURL: baseUrl,
      timeout: 30000 // 30 secondes
    });
    
    // Menu principal
    let exit = false;
    
    while (!exit) {
      console.log('\nMenu principal:');
      console.log('1. Créer un utilisateur API MTN');
      console.log('2. Tester un dépôt MTN');
      console.log('3. Vérifier le statut d\'une transaction');
      console.log('4. Tester un retrait MTN');
      console.log('5. Vérifier le statut d\'un retrait');
      console.log('6. Annuler une transaction');
      console.log('7. Vérifier la configuration MTN');
      console.log('8. Quitter');
      
      const choice = await question(rl, '\nChoisissez une option (1-8): ');
      
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
          await checkConfig(baseUrl, client);
          break;
        case '8':
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
    console.log('\nCréation d\'un nouvel utilisateur API MTN...');
    const response = await client.post(`${baseUrl}/create-api-user`);
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success) {
      console.log('\nIMPORTANT: Notez ces informations pour mettre à jour votre fichier .env:');
      console.log(`MOMO_API_DEFAULT_UUID=${response.data.data.uuid}`);
      console.log(`MOMO_API_KEY=${response.data.data.apiKey}`);
    }
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
    const response = await client.post(`${baseUrl}/deposit`, {
      phoneNumber,
      amount,
      description: description || 'Test deposit'
    });
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
    
    // Si le dépôt a été initié avec succès, afficher la référence pour faciliter la vérification ultérieure
    if (response.data.success && response.data.data && response.data.data.transactionRef) {
      console.log('\nIMPORTANT: Notez cette référence pour vérifier le statut ultérieurement:');
      console.log('Référence du dépôt:', response.data.data.transactionRef);
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
    // Correction: utiliser 'withdraw' au lieu de 'test-withdrawal'
    const response = await client.post(`${baseUrl}/withdraw`, {
      phoneNumber,
      amount,
      description: description || 'Test withdrawal'
    });
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
    
    // Si le retrait a été initié avec succès, afficher la référence pour faciliter la vérification ultérieure
    if (response.data.success && response.data.data && response.data.data.transactionRef) {
      console.log('\nIMPORTANT: Notez cette référence pour vérifier le statut ultérieurement:');
      console.log('Référence du retrait:', response.data.data.transactionRef);
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
    const response = await client.get(`${baseUrl}/cancel-transaction?ref=${ref}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function checkConfig(baseUrl: string, client: any) {
  try {
    console.log('\nVérification de la configuration MTN...');
    const response = await client.get(`${baseUrl}/config`);
    
    console.log('Configuration MTN:');
    console.table(response.data.config);
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

// Démarrer le script
bootstrap();