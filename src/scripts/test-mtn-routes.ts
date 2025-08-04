/**
 * Script pour tester les routes MTN Money de façon interactive
 * Exécuter avec: npm run test:mtn-routes
 */

import axios from 'axios';
import { ConsoleLogger } from '@nestjs/common';
import * as readline from 'readline';

const logger = new ConsoleLogger('MTN-Routes-Test');

// Interface pour les questions utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query: string): Promise<string> {
  return new Promise(resolve => rl.question(query, resolve));
}

async function bootstrap() {
  try {
    logger.log('🚀 Script de test MTN Money interactif');
    
    // Demander la configuration de base
    const baseUrl = await question('URL de base (défaut: http://localhost:3000/mtn-test): ') 
      || 'http://localhost:3000/mtn-test';
    
    const timeout = parseInt(await question('Timeout en ms (défaut: 30000): ') || '30000');
    
    logger.log(`📍 URL configurée: ${baseUrl}`);
    logger.log(`⏱️  Timeout: ${timeout}ms`);
    
    // Créer un client axios avec gestion d'erreurs améliorée
    const client = axios.create({
      baseURL: baseUrl,
      timeout: timeout,
      validateStatus: () => true, // Accepter tous les codes de statut
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    // Ajouter un intercepteur pour logger les requêtes
    client.interceptors.request.use(
      (config) => {
        logger.log(`📤 Requête: ${config.method?.toUpperCase()} ${config.url}`);
        if (config.data) {
          logger.log(`📋 Données: ${JSON.stringify(config.data, null, 2)}`);
        }
        return config;
      },
      (error) => {
        logger.error('❌ Erreur de requête:', error.message);
        return Promise.reject(error);
      }
    );

    // Ajouter un intercepteur pour logger les réponses
    client.interceptors.response.use(
      (response) => {
        logger.log(`📥 Réponse: ${response.status} ${response.statusText}`);
        return response;
      },
      (error) => {
        if (error.code === 'ECONNRESET') {
          logger.error('❌ Connexion fermée par le serveur. Vérifiez que le serveur est démarré.');
        } else if (error.code === 'ECONNREFUSED') {
          logger.error('❌ Connexion refusée. Vérifiez l\'URL et que le serveur est accessible.');
        } else if (error.code === 'ETIMEDOUT') {
          logger.error('❌ Timeout de connexion. Le serveur met trop de temps à répondre.');
        } else {
          logger.error(`❌ Erreur réseau: ${error.message}`);
        }
        return Promise.reject(error);
      }
    );
    
    // Menu principal
    await showMainMenu(client);
    
  } catch (error) {
    logger.error('❌ Erreur fatale:', error.message);
  } finally {
    rl.close();
    process.exit(0);
  }
}

async function showMainMenu(client: any) {
  let exit = false;
  
  while (!exit) {
    console.log('\n🔧 MENU PRINCIPAL - Tests MTN Money');
    console.log('1. 🔍 Vérifier la configuration MTN');
    console.log('2. 👤 Créer un utilisateur API MTN');
    console.log('3. 💰 Tester un dépôt MTN');
    console.log('4. 📊 Vérifier le statut d\'une transaction');
    console.log('5. 💸 Tester un retrait MTN');
    console.log('6. 📋 Vérifier le statut d\'un retrait');
    console.log('7. 🚀 Exécuter tous les tests automatiquement');
    console.log('8. ❌ Quitter');
    
    const choice = await question('\nChoisissez une option (1-8): ');
    
    switch (choice) {
      case '1':
        await runSafeTest('Configuration MTN', () => checkConfig(client));
        break;
      case '2':
        await runSafeTest('Création utilisateur API', () => createApiUser(client));
        break;
      case '3':
        await runSafeTest('Dépôt MTN', () => testDeposit(client));
        break;
      case '4':
        await runSafeTest('Vérification transaction', () => checkTransactionInteractive(client));
        break;
      case '5':
        await runSafeTest('Retrait MTN', () => testWithdrawal(client));
        break;
      case '6':
        await runSafeTest('Vérification retrait', () => checkWithdrawalInteractive(client));
        break;
      case '7':
        await runAllTestsInteractive(client);
        break;
      case '8':
        exit = true;
        logger.log('👋 Au revoir !');
        break;
      default:
        logger.warn('⚠️  Option invalide. Veuillez réessayer.');
    }
  }
}

async function runSafeTest(testName: string, testFunction: () => Promise<any>): Promise<any> {
  try {
    logger.log(`\n🧪 Démarrage du test: ${testName}`);
    const result = await testFunction();
    logger.log(`✅ ${testName} - RÉUSSI`);
    return result;
  } catch (error) {
    logger.error(`❌ ${testName} - ÉCHOUÉ:`);
    
    if (error.response) {
      logger.error(`   Status: ${error.response.status}`);
      logger.error(`   Message: ${JSON.stringify(error.response.data, null, 2)}`);
    } else if (error.request) {
      logger.error(`   Pas de réponse du serveur`);
      logger.error(`   Code d'erreur: ${error.code}`);
    } else {
      logger.error(`   Erreur: ${error.message}`);
    }
    
    return null;
  }
}

async function testDeposit(client: any): Promise<string | null> {
  logger.log('💰 Configuration du test de dépôt');
  
  const phoneNumber = await question('📱 Numéro de téléphone (ex: 237671162552): ');
  const amount = parseInt(await question('💵 Montant (ex: 100): '), 10);
  const description = await question('📝 Description (optionnel): ') || 'Test dépôt interactif';
  
  if (!phoneNumber || isNaN(amount) || amount <= 0) {
    throw new Error('Numéro de téléphone et montant valide requis');
  }
  
  logger.log(`💰 Test de dépôt: ${amount} XAF vers ${phoneNumber}`);
  
  const response = await client.post('/deposit', {
    phoneNumber,
    amount,
    description
  });
  
  // Accepter les codes 200 et 201 comme succès
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (response.data.success) {
    const transactionRef = response.data.data?.transactionRef || response.data.data?.ref;
    logger.log(`📋 Référence de dépôt: ${transactionRef}`);
    logger.log(`📱 Statut: ${response.data.data?.status || response.data.data?.result?.status || 'N/A'}`);
    logger.log(`🆔 ID Transaction: ${response.data.data?.transactionId || 'N/A'}`);
    return transactionRef;
  } else {
    throw new Error(`Échec du dépôt: ${response.data.message}`);
  }
}

async function testWithdrawal(client: any): Promise<string | null> {
  logger.log('💸 Configuration du test de retrait');
  
  const phoneNumber = await question('📱 Numéro de téléphone (ex: 237671162552): ');
  const amount = parseInt(await question('💵 Montant (ex: 100): '), 10);
  const description = await question('📝 Description (optionnel): ') || 'Test retrait interactif';
  
  if (!phoneNumber || isNaN(amount) || amount <= 0) {
    throw new Error('Numéro de téléphone et montant valide requis');
  }
  
  logger.log(`💸 Test de retrait: ${amount} XAF depuis ${phoneNumber}`);
  
  const response = await client.post('/withdraw', {
    phoneNumber,
    amount,
    description
  });
  
  // Accepter les codes 200 et 201 comme succès
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (response.data.success) {
    const transactionRef = response.data.data?.transactionRef || response.data.data?.ref;
    logger.log(`📋 Référence de retrait: ${transactionRef}`);
    logger.log(`📱 Statut: ${response.data.data?.status || response.data.data?.result?.status || 'N/A'}`);
    logger.log(`🆔 ID Transaction: ${response.data.data?.transactionId || 'N/A'}`);
    return transactionRef;
  } else {
    throw new Error(`Échec du retrait: ${response.data.message}`);
  }
}

async function checkTransactionInteractive(client: any): Promise<void> {
  const ref = await question('📋 Référence de la transaction: ');
  
  if (!ref) {
    throw new Error('Référence de transaction requise');
  }
  
  await checkTransaction(client, ref);
}

async function checkWithdrawalInteractive(client: any): Promise<void> {
  const ref = await question('📋 Référence du retrait: ');
  
  if (!ref) {
    throw new Error('Référence de retrait requise');
  }
  
  await checkWithdrawal(client, ref);
}

async function checkTransaction(client: any, ref: string): Promise<void> {
  logger.log(`🔍 Vérification du statut de la transaction: ${ref}`);
  
  const response = await client.get(`/check-transaction?ref=${ref}`);
  
  // Accepter les codes 200 et 201 comme succès
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  logger.log('📊 Détails de la transaction:');
  logger.log(`   Statut: ${response.data.status || response.data.data?.status || 'N/A'}`);
  logger.log(`   Montant: ${response.data.amount || response.data.data?.amount || 'N/A'} ${response.data.currency || response.data.data?.currency || ''}`);
  logger.log(`   Date: ${response.data.createdDateTime || response.data.data?.createdDateTime || 'N/A'}`);
}

async function checkWithdrawal(client: any, ref: string): Promise<void> {
  logger.log(`🔍 Vérification du statut du retrait: ${ref}`);
  
  const response = await client.get(`/check-withdrawal?ref=${ref}`);
  
  // Accepter les codes 200 et 201 comme succès
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  logger.log('📊 Détails du retrait:');
  logger.log(`   Statut: ${response.data.status || response.data.data?.status || 'N/A'}`);
  logger.log(`   Montant: ${response.data.amount || response.data.data?.amount || 'N/A'} ${response.data.currency || response.data.data?.currency || ''}`);
  logger.log(`   Date: ${response.data.createdDateTime || response.data.data?.createdDateTime || 'N/A'}`);
}

async function createApiUser(client: any): Promise<void> {
  logger.log('📝 Création d\'un nouvel utilisateur API MTN...');
  
  const response = await client.post('/create-api-user');
  
  // Accepter les codes 200 et 201 comme succès
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (response.data.success) {
    logger.log('🔑 Utilisateur API créé avec succès');
    logger.log(`   UUID: ${response.data.data?.uuid || 'N/A'}`);
    logger.log(`   API Key: ${response.data.data?.apiKey || 'N/A'}`);
    logger.warn('⚠️  IMPORTANT: Notez ces informations pour votre fichier .env');
  } else {
    throw new Error(`Échec de la création: ${response.data.message}`);
  }
}

async function checkConfig(client: any): Promise<void> {
  logger.log('⚙️  Vérification de la configuration MTN...');
  
  const response = await client.get('/config');
  
  // Accepter les codes 200 et 201 comme succès
  if (response.status !== 200 && response.status !== 201) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  logger.log('📋 Configuration MTN:');
  const config = response.data.config || response.data;
  
  Object.entries(config).forEach(([key, value]) => {
    const maskedValue = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
      ? '***MASKED***'
      : value;
    logger.log(`   ${key}: ${maskedValue}`);
  });
}

// Fonction utilitaire pour vérifier si le statut HTTP est un succès
function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

// Version améliorée des fonctions automatiques
async function runAllTestsInteractive(client: any) {
  logger.log('🚀 Exécution de tous les tests avec vos paramètres...');
  
  const phoneNumber = await question('📱 Numéro de téléphone pour tous les tests: ');
  const amount = parseInt(await question('💵 Montant pour tous les tests: '), 10);
  
  if (!phoneNumber || isNaN(amount) || amount <= 0) {
    logger.error('❌ Paramètres invalides');
    return;
  }
  
  const testResults = { passed: 0, failed: 0, total: 0 };
  
  // Fonctions de test automatiques avec gestion correcte des statuts
  const testDepositAuto = async (client: any) => {
    const response = await client.post('/deposit', {
      phoneNumber,
      amount,
      description: 'Test automatique avec paramètres utilisateur'
    });
    
    if (!isSuccessStatus(response.status)) {
      throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
    
    if (response.data.success) {
      const ref = response.data.data?.transactionRef || response.data.data?.ref;
      logger.log(`📋 Référence de dépôt: ${ref}`);
      logger.log(`📱 Statut: ${response.data.data?.status || response.data.data?.result?.status || 'N/A'}`);
      return ref;
    } else {
      throw new Error(`Échec du dépôt: ${response.data.message}`);
    }
  };
  
  const testWithdrawalAuto = async (client: any) => {
    const response = await client.post('/withdraw', {
      phoneNumber,
      amount,
      description: 'Test automatique retrait avec paramètres utilisateur'
    });
    
    if (!isSuccessStatus(response.status)) {
      throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
    
    if (response.data.success) {
      const ref = response.data.data?.transactionRef || response.data.data?.ref;
      logger.log(`📋 Référence de retrait: ${ref}`);
      logger.log(`📱 Statut: ${response.data.data?.status || response.data.data?.result?.status || 'N/A'}`);
      return ref;
    } else {
      throw new Error(`Échec du retrait: ${response.data.message}`);
    }
  };
  
  // Exécuter les tests avec comptage correct
  const configResult = await runSafeTest('Configuration MTN', () => checkConfig(client));
  testResults.total++;
  if (configResult !== null) testResults.passed++;
  
  const depositRef = await runSafeTest('Dépôt MTN', () => testDepositAuto(client));
  testResults.total++;
  if (depositRef) testResults.passed++;
  
  if (depositRef) {
    // Attendre un peu avant de vérifier le statut
    logger.log('⏳ Attente de 3 secondes avant vérification du statut...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResult = await runSafeTest('Statut dépôt', () => checkTransaction(client, depositRef));
    testResults.total++;
    if (statusResult !== null) testResults.passed++;
  }
  
  const withdrawalRef = await runSafeTest('Retrait MTN', () => testWithdrawalAuto(client));
  testResults.total++;
  if (withdrawalRef) testResults.passed++;
  
  if (withdrawalRef) {
    // Attendre un peu avant de vérifier le statut
    logger.log('⏳ Attente de 3 secondes avant vérification du statut...');
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    const statusResult = await runSafeTest('Statut retrait', () => checkWithdrawal(client, withdrawalRef));
    testResults.total++;
    if (statusResult !== null) testResults.passed++;
  }
  
  // Afficher le résumé
  logger.log('\n📊 RÉSUMÉ DES TESTS:');
  logger.log(`✅ Tests réussis: ${testResults.passed}`);
  logger.log(`❌ Tests échoués: ${testResults.failed}`);
  logger.log(`📈 Total: ${testResults.total}`);
  logger.log(`🎯 Taux de réussite: ${((testResults.passed / testResults.total) * 100).toFixed(1)}%`);
}

// Démarrer le script
bootstrap();


