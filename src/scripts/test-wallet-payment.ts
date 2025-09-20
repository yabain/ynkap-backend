/**
 * Script pour tester les routes de paiement et de wallet
 * Exécuter avec: npm run test:wallet-payment
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
    const defaultBaseUrl = 'http://localhost:3000';
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
      console.log('1. Tester les routes de wallet');
      console.log('2. Tester les routes de paiement MTN');
      console.log('3. Tester les routes de paiement Orange Money');
      console.log('4. Quitter');
      
      const choice = await question(rl, '\nChoisissez une option (1-4): ');
      
      switch (choice) {
        case '1':
          await testWalletRoutes(baseUrl, rl, client);
          break;
        case '2':
          await testMtnPaymentRoutes(baseUrl, rl, client);
          break;
        case '3':
          await testOrangeMoneyRoutes(baseUrl, rl, client);
          break;
        case '4':
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

async function testWalletRoutes(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    console.log('\n=== Test des routes de wallet ===');
    
    // Sous-menu pour les tests de wallet
    let exitWalletMenu = false;
    
    while (!exitWalletMenu) {
      console.log('\nMenu Wallet:');
      console.log('1. Obtenir les informations d\'un wallet');
      console.log('2. Mettre à jour le montant d\'un wallet');
      console.log('3. Créer un nouveau wallet');
      console.log('4. Retour au menu principal');
      
      const choice = await question(rl, '\nChoisissez une option (1-4): ');
      
      switch (choice) {
        case '1':
          await getWalletInfo(baseUrl, rl, client);
          break;
        case '2':
          await updateWalletAmount(baseUrl, rl, client);
          break;
        case '3':
          await createWallet(baseUrl, rl, client);
          break;
        case '4':
          exitWalletMenu = true;
          break;
        default:
          console.log('Option invalide. Veuillez réessayer.');
      }
    }
  } catch (error) {
    console.error('Erreur lors des tests de wallet:', error.response?.data || error.message);
  }
}

async function getWalletInfo(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const appID = await question(rl, 'ID de l\'application: ');
    
    console.log('\nRécupération des informations du wallet...');
    const response = await client.get(`${baseUrl}/wallet/${appID}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function updateWalletAmount(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const appID = await question(rl, 'ID de l\'application: ');
    const amount = parseInt(await question(rl, 'Nouveau montant: '), 10);
    
    console.log('\nMise à jour du montant du wallet...');
    const response = await client.put(`${baseUrl}/wallet/${appID}`, {
      amount
    });
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function createWallet(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const appID = await question(rl, 'ID de l\'application: ');
    const amountInput = await question(rl, 'Montant initial (défaut: 0): ');
    const amount = amountInput ? parseInt(amountInput, 10) : 0;
    
    console.log('\nCréation d\'un nouveau wallet...');
    const response = await client.post(`${baseUrl}/wallet/${appID}`, {
      amount
    });
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function testMtnPaymentRoutes(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    console.log('\n=== Test des routes de paiement MTN ===');
    
    // Sous-menu pour les tests de paiement MTN
    let exitMtnMenu = false;
    
    while (!exitMtnMenu) {
      console.log('\nMenu Paiement MTN:');
      console.log('1. Initier un dépôt');
      console.log('2. Vérifier le statut d\'une transaction');
      console.log('3. Initier un retrait');
      console.log('4. Vérifier le statut d\'un retrait');
      console.log('5. Annuler une transaction');
      console.log('6. Vérifier la configuration MTN');
      console.log('7. Retour au menu principal');
      
      const choice = await question(rl, '\nChoisissez une option (1-7): ');
      
      switch (choice) {
        case '1':
          await testDeposit(baseUrl, rl, client);
          break;
        case '2':
          await checkTransaction(baseUrl, rl, client);
          break;
        case '3':
          await testWithdrawal(baseUrl, rl, client);
          break;
        case '4':
          await checkWithdrawal(baseUrl, rl, client);
          break;
        case '5':
          await cancelTransaction(baseUrl, rl, client);
          break;
        case '6':
          await checkConfig(baseUrl, client);
          break;
        case '7':
          exitMtnMenu = true;
          break;
        default:
          console.log('Option invalide. Veuillez réessayer.');
      }
    }
  } catch (error) {
    console.error('Erreur lors des tests de paiement MTN:', error.response?.data || error.message);
  }
}

async function testDeposit(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const phoneNumber = await question(rl, 'Numéro de téléphone (ex: 237671162552): ');
    const amount = parseInt(await question(rl, 'Montant (ex: 100): '), 10);
    const description = await question(rl, 'Description (optionnel): ');
    
    console.log('\nInitiation du dépôt MTN Money...');
    const response = await client.post(`${baseUrl}/mtn-test/deposit`, {
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
    const response = await client.get(`${baseUrl}/mtn-test/check-transaction?ref=${ref}`);
    
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
    const response = await client.post(`${baseUrl}/mtn-test/withdraw`, {
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
    const response = await client.get(`${baseUrl}/mtn-test/check-withdrawal?ref=${ref}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function cancelTransaction(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const ref = await question(rl, 'Référence de la transaction à annuler: ');
    
    console.log('\nAnnulation de la transaction...');
    const response = await client.get(`${baseUrl}/mtn-test/cancel-transaction?ref=${ref}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function checkConfig(baseUrl: string, client: any) {
  try {
    console.log('\nVérification de la configuration MTN...');
    const response = await client.get(`${baseUrl}/mtn-test/config`);
    
    console.log('Configuration MTN:');
    console.table(response.data.config);
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function testOrangeMoneyRoutes(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    console.log('\n=== Test des routes de paiement Orange Money ===');
    
    // Sous-menu pour les tests de paiement Orange Money
    let exitOrangeMenu = false;
    
    while (!exitOrangeMenu) {
      console.log('\nMenu Paiement Orange Money:');
      console.log('1. Initier un paiement');
      console.log('2. Vérifier le statut d\'une transaction');
      console.log('3. Retour au menu principal');
      
      const choice = await question(rl, '\nChoisissez une option (1-3): ');
      
      switch (choice) {
        case '1':
          await initiateOrangeMoneyPayment(baseUrl, rl, client);
          break;
        case '2':
          await checkOrangeMoneyTransaction(baseUrl, rl, client);
          break;
        case '3':
          exitOrangeMenu = true;
          break;
        default:
          console.log('Option invalide. Veuillez réessayer.');
      }
    }
  } catch (error) {
    console.error('Erreur lors des tests de paiement Orange Money:', error.response?.data || error.message);
  }
}

async function initiateOrangeMoneyPayment(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const phoneNumber = await question(rl, 'Numéro de téléphone (ex: 237671162552): ');
    const amount = parseInt(await question(rl, 'Montant (ex: 100): '), 10);
    const description = await question(rl, 'Description (optionnel): ');
    
    console.log('\nInitiation du paiement Orange Money...');
    const response = await client.post(`${baseUrl}/payment/pay`, {
      amount,
      currency: "XAF",
      paymentMethod: "orange-money",
      userRef: {
        account: phoneNumber,
        name: "Test User"
      },
      raison: description || 'Test payment',
      callbackUrl: "https://example.com/callback"
    });
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
    
    // Si le paiement a été initié avec succès, afficher l'ID de transaction
    if (response.data && response.data.data && response.data.data.transactionId) {
      console.log('\nIMPORTANT: Notez cet ID pour vérifier le statut ultérieurement:');
      console.log('ID de transaction:', response.data.data.transactionId);
    }
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

async function checkOrangeMoneyTransaction(baseUrl: string, rl: readline.Interface, client: any) {
  try {
    const transactionId = await question(rl, 'ID de la transaction: ');
    
    console.log('\nVérification du statut de la transaction Orange Money...');
    const response = await client.get(`${baseUrl}/payment/status/${transactionId}`);
    
    console.log('Réponse:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Erreur:', error.response?.data || error.message);
  }
}

// Démarrer le script
bootstrap();