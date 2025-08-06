/**
 * Script pour tester les routes MTN Money de façon interactive
 * Exécuter avec: NODE_ENV=prod npm run test:mtn-routes
 */

import { Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import * as readline from 'readline';
import * as dotenv from 'dotenv';

// Charger le fichier d'environnement approprié
const envFile = process.env.NODE_ENV === 'prod' ? '.env.prod' : '.env.dev';
console.log(`🔧 Chargement de l'environnement depuis: ${envFile}`);
dotenv.config({ path: envFile });

const logger = new Logger('MTN-Routes-Production');

// Vérification immédiate des variables d'environnement
console.log('🔍 Vérification des variables d\'environnement:');
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`MOMO_API_PRIMARY_KEY: ${process.env.MOMO_API_PRIMARY_KEY ? '✅ Définie' : '❌ Manquante'}`);
console.log(`MOMO_API_SECONDARY_KEY: ${process.env.MOMO_API_SECONDARY_KEY ? '✅ Définie' : '❌ Manquante'}`);
console.log(`MOMO_API_PATH: ${process.env.MOMO_API_PATH || '❌ Manquante'}`);
console.log(`MOMO_API_MODE_ENV: ${process.env.MOMO_API_MODE_ENV || '❌ Manquante'}`);

// Configuration pour la production - CORRIGÉE
const PRODUCTION_CONFIG = {
  baseURL: 'https://ynkap.yaba-in.com/api/v1/financial-transaction/mtn-test',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// Testez directement avec l'API MTN (temporaire pour debug)
const DIRECT_MTN_CONFIG = {
  baseURL: 'https://proxy.momoapi.mtn.com',
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'Ocp-Apim-Subscription-Key': process.env.MOMO_API_PRIMARY_KEY,
    'X-Target-Environment': 'production'
  }
};

// Interface readline pour saisie utilisateur
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (prompt: string): Promise<string> => {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
};

// Fonction de confirmation pour paiements réels
async function confirmRealPayment(amount: number, phoneNumber: string): Promise<boolean> {
  console.log('\n🚨 ATTENTION: PAIEMENT RÉEL EN PRODUCTION 🚨');
  console.log(`💰 Montant: ${amount} XAF`);
  console.log(`📱 Numéro: ${phoneNumber}`);
  console.log('⚠️  Ce sera un vrai paiement avec de l\'argent réel!');
  
  const confirmation = await question('\n✅ Confirmez-vous ce paiement réel? (tapez "OUI CONFIRME" pour continuer): ');
  
  return confirmation.trim() === 'OUI CONFIRME';
}

// Fonction de validation du numéro camerounais
function validateCameroonianNumber(phoneNumber: string): boolean {
  // Formats acceptés: 237XXXXXXXXX, 6XXXXXXXX, +237XXXXXXXXX
  const patterns = [
    /^237[67]\d{8}$/, // 237671234567
    /^[67]\d{8}$/, // 671234567
    /^\+237[67]\d{8}$/ // +237671234567
  ];
  
  return patterns.some(pattern => pattern.test(phoneNumber.replace(/\s/g, '')));
}

// Fonction pour formater le numéro
function formatPhoneNumber(phoneNumber: string): string {
  const cleaned = phoneNumber.replace(/[\s\+]/g, '');
  
  if (cleaned.startsWith('237')) {
    return cleaned;
  } else if (cleaned.startsWith('6') || cleaned.startsWith('7')) {
    return '237' + cleaned;
  }
  
  return cleaned;
}

async function testRealDeposit(client: AxiosInstance): Promise<string | null> {
  logger.warn('💰 CONFIGURATION DU DÉPÔT RÉEL EN PRODUCTION');
  
  let phoneNumber = await question('📱 Numéro de téléphone camerounais (ex: 671162552): ');
  
  if (!validateCameroonianNumber(phoneNumber)) {
    logger.error('❌ Numéro de téléphone invalide. Utilisez un numéro camerounais (6XXXXXXXX ou 7XXXXXXXX)');
    return null;
  }
  
  phoneNumber = formatPhoneNumber(phoneNumber);
  
  const amountStr = await question('💵 Montant en XAF (minimum 100): ');
  const amount = parseInt(amountStr, 10);
  
  if (isNaN(amount) || amount < 100) {
    logger.error('❌ Montant invalide. Minimum 100 XAF requis');
    return null;
  }
  
  const description = await question('📝 Description du paiement: ') || 'Paiement test production';
  
  // Confirmation obligatoire pour paiement réel
  const confirmed = await confirmRealPayment(amount, phoneNumber);
  if (!confirmed) {
    logger.warn('❌ Paiement annulé par l\'utilisateur');
    return null;
  }
  
  logger.warn(`🚨 INITIATION DU PAIEMENT RÉEL: ${amount} XAF vers ${phoneNumber}`);

  // Ajout de debug pour voir la structure de réponse
  const response = await client.post('/deposit', {
    phoneNumber,
    amount,
    description
  });

  // Debug complet de la réponse
  logger.log(`🔍 DEBUG - Réponse complète MTN:`);
  logger.log(`📊 Status HTTP: ${response.status}`);
  logger.log(`📋 Headers: ${JSON.stringify(response.headers, null, 2)}`);
  logger.log(`📦 Data complète: ${JSON.stringify(response.data, null, 2)}`);
  logger.log(`🎯 Success field: ${response.data?.success}`);
  logger.log(`📝 Message field: ${response.data?.message}`);

  if (!isSuccessStatus(response.status)) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (response.data.success) {
    const transactionRef = response.data.data?.transactionRef || response.data.data?.ref;
    logger.log(`✅ PAIEMENT RÉEL INITIÉ AVEC SUCCÈS`);
    logger.log(`📋 Référence: ${transactionRef}`);
    logger.log(`📱 Statut: ${response.data.data?.status || response.data.data?.result?.status || 'N/A'}`);
    logger.log(`🆔 ID Transaction: ${response.data.data?.transactionId || 'N/A'}`);
    logger.warn(`💡 Le client doit maintenant confirmer le paiement sur son téléphone`);
    return transactionRef;
  } else {
    // Amélioration du logging d'erreur
    logger.error(`❌ Dépôt RÉEL MTN - DÉTAILS COMPLETS:`);
    logger.error(`📋 Réponse complète: ${JSON.stringify(response.data, null, 2)}`);
    logger.error(`📱 Success: ${response.data.success}`);
    logger.error(`📝 Message: ${response.data.message || 'Aucun message d\'erreur'}`);
    logger.error(`🔍 Data: ${JSON.stringify(response.data.data || {}, null, 2)}`);
    
    const errorMessage = response.data.message || 
                        response.data.error || 
                        response.data.data?.message || 
                        'Erreur inconnue - vérifiez les logs ci-dessus';
    
    throw new Error(`Échec du paiement: ${errorMessage}`);
  }
}

async function testRealWithdrawal(client: AxiosInstance): Promise<string | null> {
  logger.warn('💸 CONFIGURATION DU RETRAIT RÉEL EN PRODUCTION');
  
  let phoneNumber = await question('📱 Numéro de téléphone camerounais (ex: 671162552): ');
  
  if (!validateCameroonianNumber(phoneNumber)) {
    logger.error('❌ Numéro de téléphone invalide. Utilisez un numéro camerounais');
    return null;
  }
  
  phoneNumber = formatPhoneNumber(phoneNumber);
  
  const amountStr = await question('💵 Montant en XAF (minimum 100): ');
  const amount = parseInt(amountStr, 10);
  
  if (isNaN(amount) || amount < 100) {
    logger.error('❌ Montant invalide. Minimum 100 XAF requis');
    return null;
  }
  
  const description = await question('📝 Description du retrait: ') || 'Retrait test production';
  
  // Confirmation obligatoire pour retrait réel
  const confirmed = await confirmRealPayment(amount, phoneNumber);
  if (!confirmed) {
    logger.warn('❌ Retrait annulé par l\'utilisateur');
    return null;
  }
  
  logger.warn(`🚨 INITIATION DU RETRAIT RÉEL: ${amount} XAF vers ${phoneNumber}`);
  
  const response = await client.post('/withdraw', {
    phoneNumber,
    amount,
    description
  });
  
  // Debug complet de la réponse
  logger.log(`🔍 DEBUG - Réponse complète retrait:`);
  logger.log(`📊 Status HTTP: ${response.status}`);
  logger.log(`📦 Data complète: ${JSON.stringify(response.data, null, 2)}`);
  logger.log(`🎯 Success field: ${response.data?.success}`);
  logger.log(`📝 Message field: ${response.data?.message}`);
  
  if (!isSuccessStatus(response.status)) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  if (response.data.success) {
    const transactionRef = response.data.data?.transactionRef || response.data.data?.ref;
    logger.log(`✅ RETRAIT RÉEL INITIÉ AVEC SUCCÈS`);
    logger.log(`📋 Référence: ${transactionRef}`);
    logger.log(`📱 Statut: ${response.data.data?.status || response.data.data?.result?.status || 'N/A'}`);
    logger.log(`🆔 ID Transaction: ${response.data.data?.transactionId || 'N/A'}`);
    logger.warn(`💡 Le retrait sera traité automatiquement`);
    return transactionRef;
  } else {
    logger.error(`❌ Retrait RÉEL MTN - DÉTAILS COMPLETS:`);
    logger.error(`📋 Réponse complète: ${JSON.stringify(response.data, null, 2)}`);
    logger.error(`📱 Success: ${response.data.success}`);
    logger.error(`📝 Message: ${response.data.message || 'Aucun message d\'erreur'}`);
    logger.error(`🔍 Data: ${JSON.stringify(response.data.data || {}, null, 2)}`);
    
    const errorMessage = response.data.message || 
                        response.data.error || 
                        response.data.data?.message || 
                        'Erreur inconnue - vérifiez les logs ci-dessus';
    
    throw new Error(`Échec du retrait: ${errorMessage}`);
  }
}

// Menu principal adapté pour la production
async function showProductionMenu(): Promise<void> {
  console.log('\n🚨 === TESTS MTN MONEY - MODE PRODUCTION === 🚨');
  console.log('⚠️  ATTENTION: Tous les paiements seront RÉELS avec de l\'argent réel!');
  console.log('\n📋 Options disponibles:');
  console.log('1. 💰 Test de dépôt RÉEL (paiement client)');
  console.log('2. 💸 Test de retrait RÉEL (envoi d\'argent)');
  console.log('3. 🔍 Vérifier le statut d\'une transaction');
  console.log('4. 🔍 Vérifier le statut d\'un retrait');
  console.log('5. ⚙️  Vérifier la configuration MTN');
  console.log('6. 📊 Historique des transactions');
  console.log('7. 🚀 Tests automatisés (DANGEREUX - paiements réels!)');
  console.log('8. ❌ Quitter');
  console.log('\n⚠️  RAPPEL: Vous êtes en mode PRODUCTION - argent réel!');
}

async function main() {
  logger.warn('🚨 DÉMARRAGE DES TESTS MTN MONEY EN PRODUCTION 🚨');
  logger.warn('⚠️  Mode: PRODUCTION - Paiements réels avec argent réel!');
  
  // Vérification de l'environnement
  if (process.env.NODE_ENV !== 'prod') {
    logger.error('❌ Ce script doit être exécuté avec NODE_ENV=prod');
    process.exit(1);
  }
  
  // Vérification des clés de production
  if (!process.env.MOMO_API_PRIMARY_KEY || !process.env.MOMO_API_SECONDARY_KEY) {
    logger.error('❌ Clés de production MTN manquantes (MOMO_API_PRIMARY_KEY, MOMO_API_SECONDARY_KEY)');
    process.exit(1);
  }
  
  logger.log('✅ Configuration de production détectée');
  logger.log(`📡 Endpoint: ${PRODUCTION_CONFIG.baseURL}`);
  logger.log(`🔑 Clés de production: Configurées`);
  
  // Confirmation finale avant de commencer
  console.log('\n🚨 DERNIÈRE CONFIRMATION 🚨');
  const finalConfirm = await question('Vous allez effectuer des paiements RÉELS. Tapez "JE COMPRENDS" pour continuer: ');
  
  if (finalConfirm.trim() !== 'JE COMPRENDS') {
    logger.warn('❌ Tests annulés - confirmation non reçue');
    rl.close();
    return;
  }
  
  const client = createAxiosClient();
  
  while (true) {
    try {
      await showProductionMenu();
      const choice = await question('\n🎯 Votre choix (1-8): ');
      
      switch (choice.trim()) {
        case '1':
          await runSafeTest('Dépôt RÉEL MTN', () => testRealDeposit(client));
          break;
        case '2':
          await runSafeTest('Retrait RÉEL MTN', () => testRealWithdrawal(client));
          break;
        case '3':
          const ref = await question('📋 Référence de transaction: ');
          if (ref.trim()) {
            await runSafeTest('Vérification transaction', () => checkTransaction(client, ref.trim()));
          }
          break;
        case '4':
          const withdrawalRef = await question('📋 Référence de retrait: ');
          if (withdrawalRef.trim()) {
            await runSafeTest('Vérification retrait', () => checkWithdrawal(client, withdrawalRef.trim()));
          }
          break;
        case '5':
          await runSafeTest('Configuration MTN', () => checkConfig(client));
          break;
        case '6':
          logger.warn('📊 Fonctionnalité d\'historique à implémenter');
          break;
        case '7':
          logger.error('🚨 Tests automatisés désactivés en production pour éviter les paiements accidentels');
          break;
        case '8':
          logger.log('👋 Au revoir!');
          rl.close();
          return;
        default:
          logger.warn('❌ Choix invalide. Veuillez choisir entre 1 et 8.');
      }
      
      // Pause entre les opérations
      await question('\n⏸️  Appuyez sur Entrée pour continuer...');
      
    } catch (error) {
      logger.error('❌ Erreur dans le menu principal:', error.message);
    }
  }
}

// Fonction utilitaire pour vérifier les statuts de succès
function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

// Créer le client Axios avec configuration de production
function createAxiosClient(): AxiosInstance {
  const client = axios.create(PRODUCTION_CONFIG);
  
  // Intercepteur pour les requêtes
  client.interceptors.request.use(
    (config) => {
      logger.log(`🚀 Requête PRODUCTION: ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data) {
        const safeData = { ...config.data };
        // Masquer les données sensibles dans les logs
        if (safeData.phoneNumber) {
          safeData.phoneNumber = safeData.phoneNumber.replace(/(\d{3})\d{6}(\d{2})/, '$1******$2');
        }
        logger.log(`📤 Données: ${JSON.stringify(safeData)}`);
      }
      return config;
    },
    (error) => {
      logger.error('❌ Erreur de requête:', error.message);
      return Promise.reject(error);
    }
  );
  
  // Intercepteur pour les réponses
  client.interceptors.response.use(
    (response) => {
      logger.log(`📥 Réponse PRODUCTION: ${response.status} ${response.statusText}`);
      return response;
    },
    (error) => {
      if (error.response) {
        logger.error(`❌ Erreur HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`);
      } else if (error.request) {
        logger.error('❌ Pas de réponse du serveur:', error.message);
      } else {
        logger.error('❌ Erreur de configuration:', error.message);
      }
      return Promise.reject(error);
    }
  );
  
  return client;
}

// Fonction pour exécuter les tests de manière sécurisée
async function runSafeTest(testName: string, testFunction: () => Promise<any>): Promise<any> {
  try {
    logger.log(`\n🧪 === ${testName.toUpperCase()} ===`);
    const result = await testFunction();
    logger.log(`✅ ${testName} - RÉUSSI`);
    return result;
  } catch (error) {
    logger.error(`❌ ${testName} - ÉCHOUÉ:`);
    logger.error(`   Erreur: ${error.message}`);
    return null;
  }
}

// Fonctions existantes adaptées (checkTransaction, checkWithdrawal, checkConfig)
async function checkTransaction(client: AxiosInstance, ref: string): Promise<void> {
  logger.log(`🔍 Vérification RÉELLE du statut de la transaction: ${ref}`);
  
  const response = await client.get(`/check-transaction?ref=${ref}`);
  
  if (!isSuccessStatus(response.status)) {
    throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  logger.log('📊 Détails de la transaction RÉELLE:');
  logger.log(`   Statut: ${response.data.status || response.data.data?.status || 'N/A'}`);
  logger.log(`   Montant: ${response.data.amount || response.data.data?.amount || 'N/A'} ${response.data.currency || response.data.data?.currency || 'XAF'}`);
  logger.log(`   Date: ${response.data.createdDateTime || response.data.data?.createdDateTime || 'N/A'}`);
}

async function checkWithdrawal(client: AxiosInstance, ref: string): Promise<void> {
  logger.log(`🔍 Vérification RÉELLE du statut du retrait: ${ref}`);
  
  const response = await client.get(`/check-withdrawal?ref=${ref}`);
  
  if (!isSuccessStatus(response.status)) {
 
   throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
  }
  
  logger.log('📊 Détails du retrait RÉEL:');
  logger.log(`   Statut: ${response.data.status || response.data.data?.status || 'N/A'}`);
  logger.log(`   Montant: ${response.data.amount || response.data.data?.amount || 'N/A'} ${response.data.currency || response.data.data?.currency || 'XAF'}`);
  logger.log(`   Date: ${response.data.createdDateTime || response.data.data?.createdDateTime || 'N/A'}`);
}

async function checkConfig(client: AxiosInstance): Promise<void> {
  logger.log('⚙️  Vérification de la configuration MTN PRODUCTION...');
  
  try {
    const response = await client.get('/config');
    
    if (!isSuccessStatus(response.status)) {
      throw new Error(`Erreur HTTP ${response.status}: ${JSON.stringify(response.data)}`);
    }
    
    logger.log('📋 Configuration MTN PRODUCTION:');
    logger.log(`📦 Réponse complète: ${JSON.stringify(response.data, null, 2)}`);
    
    const config = response.data.config || response.data;
    
    Object.entries(config).forEach(([key, value]) => {
      const maskedValue = key.toLowerCase().includes('key') || key.toLowerCase().includes('secret')
        ? '***PRODUCTION-KEY***'
        : value;
      logger.log(`   ${key}: ${maskedValue}`);
    });
  } catch (error) {
    logger.error('❌ Erreur lors de la vérification de la configuration:', error.message);
    logger.error('📋 Détails:', JSON.stringify(error.response?.data || {}, null, 2));
  }
}

// Démarrer le script
if (require.main === module) {
  main().catch((error) => {
    logger.error('❌ Erreur fatale:', error);
    rl.close();
    process.exit(1);
  });
}





















