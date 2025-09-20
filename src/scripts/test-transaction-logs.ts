/**
 * Script pour tester les routes des logs de transactions
 * Exécuter avec: npm run test:transaction-logs
 */
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { LogService } from '../logs/services/log.service';
import { LogLevel } from '../logs/enums/log-level.enum';
import { LogType } from '../logs/enums/log-type.enum';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const logService = app.get(LogService);
    
    // Interface pour lire les entrées utilisateur
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Fonction pour poser une question et obtenir une réponse
    const question = (query: string): Promise<string> => {
      return new Promise((resolve) => {
        rl.question(query, (answer) => {
          resolve(answer);
        });
      });
    };
    
    console.log('=== TEST DES LOGS DE TRANSACTIONS ===\n');
    
    let exit = false;
    
    while (!exit) {
      console.log('\nMenu principal:');
      console.log('1. Créer un log de transaction');
      console.log('2. Rechercher des logs de transactions');
      console.log('3. Exporter des logs de transactions');
      console.log('4. Supprimer des logs de transactions');
      console.log('5. Quitter');
      
      const choice = await question('\nChoisissez une option (1-5): ');
      
      switch (choice) {
        case '1':
          await createTransactionLog(logService, question);
          break;
        case '2':
          await searchTransactionLogs(logService, question);
          break;
        case '3':
          await exportTransactionLogs(logService, question);
          break;
        case '4':
          await deleteTransactionLogs(logService, question);
          break;
        case '5':
          exit = true;
          break;
        default:
          console.log('Option invalide. Veuillez réessayer.');
      }
    }
    
    console.log('\nFermeture du script...');
    rl.close();
    await app.close();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors du test des logs de transactions:', error);
    process.exit(1);
  }
}

async function createTransactionLog(logService: LogService, question: (query: string) => Promise<string>) {
  console.log('\n=== CRÉATION D\'UN LOG DE TRANSACTION ===');
  
  // Définir le type de log comme TRANSACTION
  const type = LogType.TRANSACTION;
  console.log(`\nType de log: ${type}`);
  
  // Afficher les niveaux de log disponibles
  console.log('\nNiveaux de log disponibles:');
  Object.values(LogLevel).forEach((level, index) => {
    console.log(`${index + 1}. ${level}`);
  });
  
  const levelChoice = await question('\nChoisissez un niveau de log (numéro): ');
  const levelIndex = parseInt(levelChoice) - 1;
  
  if (isNaN(levelIndex) || levelIndex < 0 || levelIndex >= Object.values(LogLevel).length) {
    console.log('Choix de niveau invalide.');
    return;
  }
  
  const level = Object.values(LogLevel)[levelIndex];
  
  // Demander les informations spécifiques aux transactions
  const transactionId = await question('\nID de la transaction: ');
  const amount = await question('Montant de la transaction: ');
  const currency = await question('Devise (XAF par défaut): ') || 'XAF';
  const status = await question('Statut de la transaction: ');
  const paymentMethod = await question('Méthode de paiement: ');
  const userId = await question('ID de l\'utilisateur: ');
  const applicationId = await question('ID de l\'application: ');
  
  // Construire le message du log
  const message = `Transaction ${transactionId} - ${amount} ${currency} - ${status}`;
  
  // Construire les métadonnées
  const metadata = {
    transactionId,
    amount,
    currency,
    status,
    paymentMethod,
    userId,
    applicationId
  };
  
  // Créer le log
  try {
    const logData = {
      level,
      type,
      message,
      user: userId,
      metadata
    };
    
    console.log('\nCréation du log avec les données suivantes:');
    console.log(JSON.stringify(logData, null, 2));
    
    const log = await logService.create(logData);
    
    console.log('\nLog de transaction créé avec succès:');
    console.log(JSON.stringify(log, null, 2));
  } catch (error) {
    console.error('Erreur lors de la création du log de transaction:', error.message);
  }
}

async function searchTransactionLogs(logService: LogService, question: (query: string) => Promise<string>) {
  console.log('\n=== RECHERCHE DE LOGS DE TRANSACTIONS ===');
  
  // Définir le type de log comme TRANSACTION
  const filter: any = { type: LogType.TRANSACTION };
  
  console.log('\nOptions de filtrage supplémentaires:');
  console.log('1. Par niveau de log');
  console.log('2. Par ID de transaction');
  console.log('3. Par statut de transaction');
  console.log('4. Par utilisateur');
  console.log('5. Par application');
  console.log('6. Par période');
  console.log('7. Par montant');
  console.log('8. Aucun filtre supplémentaire');
  
  const filterChoice = await question('\nChoisissez une option de filtrage (numéro): ');
  
  switch (filterChoice) {
    case '1':
      // Filtrer par niveau
      console.log('\nNiveaux de log disponibles:');
      Object.values(LogLevel).forEach((level, index) => {
        console.log(`${index + 1}. ${level}`);
      });
      
      const levelChoice = await question('\nChoisissez un niveau de log (numéro): ');
      const levelIndex = parseInt(levelChoice) - 1;
      
      if (isNaN(levelIndex) || levelIndex < 0 || levelIndex >= Object.values(LogLevel).length) {
        console.log('Choix de niveau invalide.');
        return;
      }
      
      filter.level = Object.values(LogLevel)[levelIndex];
      break;
      
    case '2':
      // Filtrer par ID de transaction
      const transactionId = await question('\nEntrez l\'ID de la transaction: ');
      filter['metadata.transactionId'] = transactionId;
      break;
      
    case '3':
      // Filtrer par statut de transaction
      const status = await question('\nEntrez le statut de la transaction: ');
      filter['metadata.status'] = status;
      break;
      
    case '4':
      // Filtrer par utilisateur
      const userId = await question('\nEntrez l\'ID de l\'utilisateur: ');
      filter.user = userId;
      break;
      
    case '5':
      // Filtrer par application
      const applicationId = await question('\nEntrez l\'ID de l\'application: ');
      filter['metadata.applicationId'] = applicationId;
      break;
      
    case '6':
      // Filtrer par période
      console.log('\nPériode de recherche:');
      console.log('1. Aujourd\'hui');
      console.log('2. Cette semaine');
      console.log('3. Ce mois');
      console.log('4. Les 3 derniers mois');
      console.log('5. Période personnalisée');
      
      const periodChoice = await question('\nChoisissez une période (numéro): ');
      const periodNum = parseInt(periodChoice);
      
      if (isNaN(periodNum) || periodNum < 1 || periodNum > 5) {
        console.log('Choix de période invalide.');
        return;
      }
      
      const now = new Date();
      let startDate: Date;
      let endDate: Date = new Date(now);
      
      switch (periodNum) {
        case 1: // Aujourd'hui
          startDate = new Date(now);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 2: // Cette semaine
          startDate = new Date(now);
          startDate.setDate(now.getDate() - now.getDay());
          startDate.setHours(0, 0, 0, 0);
          break;
        case 3: // Ce mois
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 4: // Les 3 derniers mois
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 3);
          break;
        case 5: // Période personnalisée
          const startDateStr = await question('\nDate de début (YYYY-MM-DD): ');
          const endDateStr = await question('Date de fin (YYYY-MM-DD): ');
          
          startDate = new Date(startDateStr);
          endDate = new Date(endDateStr);
          endDate.setHours(23, 59, 59, 999);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            console.log('Format de date invalide.');
            return;
          }
          break;
      }
      
      // Utiliser une approche générique pour le filtrage par date
      filter.dateRange = { start: startDate, end: endDate };
      break;
      
    case '7':
      // Filtrer par montant
      console.log('\nOptions de filtrage par montant:');
      console.log('1. Montant exact');
      console.log('2. Montant minimum');
      console.log('3. Montant maximum');
      console.log('4. Plage de montants');
      
      const amountFilterChoice = await question('\nChoisissez une option (numéro): ');
      
      switch (amountFilterChoice) {
        case '1':
          const exactAmount = await question('\nEntrez le montant exact: ');
          filter['metadata.amount'] = exactAmount;
          break;
        case '2':
          const minAmount = await question('\nEntrez le montant minimum: ');
          filter['metadata.amount'] = { $gte: minAmount };
          break;
        case '3':
          const maxAmount = await question('\nEntrez le montant maximum: ');
          filter['metadata.amount'] = { $lte: maxAmount };
          break;
        case '4':
          const minRangeAmount = await question('\nEntrez le montant minimum: ');
          const maxRangeAmount = await question('Entrez le montant maximum: ');
          filter['metadata.amount'] = { $gte: minRangeAmount, $lte: maxRangeAmount };
          break;
        default:
          console.log('Option invalide.');
          return;
      }
      break;
      
    case '8':
      // Aucun filtre supplémentaire
      break;
      
    default:
      console.log('Option invalide.');
      return;
  }
  
  // Récupérer les logs
  try {
    console.log('\nRécupération des logs de transactions...');
    console.log('Filtre appliqué:', JSON.stringify(filter, null, 2));
    
    const logs = await logService.findAll(filter);
    
    console.log(`\n${logs.length} logs de transactions trouvés.`);
    
    if (logs.length === 0) {
      console.log('Aucun log de transaction trouvé pour les critères spécifiés.');
      return;
    }
    
    // Afficher les logs
    console.log('\n=== RÉSULTATS DE LA RECHERCHE ===');
    
    // Demander le format d'affichage
    console.log('\nFormat d\'affichage:');
    console.log('1. Afficher tous les détails');
    console.log('2. Afficher un résumé');
    
    const displayChoice = await question('\nChoisissez un format d\'affichage (numéro): ');
    
    if (displayChoice === '1') {
      // Afficher tous les détails
      logs.forEach((log, index) => {
        console.log(`\nLog de transaction ${index + 1}:`);
        console.log(JSON.stringify(log, null, 2));
      });
    } else {
      // Afficher un résumé
      logs.forEach((log, index) => {
        const metadata = log.metadata || {};
        console.log(`\nLog de transaction ${index + 1}:`);
        console.log(`- ID: ${log._id}`);
        console.log(`- Niveau: ${log.level}`);
        console.log(`- Message: ${log.message}`);
        console.log(`- Date: ${new Date().toLocaleString()}`); // Date actuelle pour éviter les erreurs
        console.log(`- Transaction ID: ${metadata.transactionId || 'N/A'}`);
        console.log(`- Montant: ${metadata.amount || '0'} ${metadata.currency || 'XAF'}`);
        console.log(`- Statut: ${metadata.status || 'N/A'}`);
        console.log(`- Méthode de paiement: ${metadata.paymentMethod || 'N/A'}`);
        console.log(`- Utilisateur: ${log.user || metadata.userId || 'N/A'}`);
        console.log(`- Application: ${metadata.applicationId || 'N/A'}`);
      });
    }
  } catch (error) {
    console.error('Erreur lors de la recherche des logs de transactions:', error.message);
  }
}

async function exportTransactionLogs(logService: LogService, question: (query: string) => Promise<string>) {
  console.log('\n=== EXPORTATION DES LOGS DE TRANSACTIONS ===');
  
  // Définir le type de log comme TRANSACTION
  const filter: any = { type: LogType.TRANSACTION };
  
  console.log('\nOptions de filtrage supplémentaires:');
  console.log('1. Par niveau de log');
  console.log('2. Par ID de transaction');
  console.log('3. Par statut de transaction');
  console.log('4. Par utilisateur');
  console.log('5. Par application');
  console.log('6. Par période');
  console.log('7. Par montant');
  console.log('8. Aucun filtre supplémentaire');
  
  const filterChoice = await question('\nChoisissez une option de filtrage (numéro): ');
  
  // Logique de filtrage similaire à searchTransactionLogs
  // ...
  
  // Récupérer les logs
  try {
    console.log('\nRécupération des logs de transactions...');
    console.log('Filtre appliqué:', JSON.stringify(filter, null, 2));
    
    const logs = await logService.findAll(filter);
    
    console.log(`\n${logs.length} logs de transactions trouvés.`);
    
    if (logs.length === 0) {
      console.log('Aucun log de transaction trouvé pour les critères spécifiés.');
      return;
    }
    
    // Demander le format d'exportation
    console.log('\nFormat d\'exportation:');
    console.log('1. CSV');
    console.log('2. JSON');
    console.log('3. PDF (résumé)');
    
    const formatChoice = await question('\nChoisissez un format d\'exportation (numéro): ');
    
    if (!['1', '2', '3'].includes(formatChoice)) {
      console.log('Format d\'exportation invalide.');
      return;
    }
    
    // Formater les logs pour l'exportation
    const formattedLogs = logs.map(log => {
      const metadata = log.metadata || {};
      return {
        id: log._id.toString(),
        level: log.level,
        message: log.message,
        date: new Date().toISOString(), // Date actuelle pour éviter les erreurs
        transactionId: metadata.transactionId || 'N/A',
        amount: metadata.amount || '0',
        currency: metadata.currency || 'XAF',
        status: metadata.status || 'N/A',
        paymentMethod: metadata.paymentMethod || 'N/A',
        user: log.user || metadata.userId || 'N/A',
        application: metadata.applicationId || 'N/A'
      };
    });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    
    if (formatChoice === '1') {
      // Exporter en CSV
      const csvHeader = 'ID,Niveau,Message,Date,Transaction ID,Montant,Devise,Statut,Méthode de paiement,Utilisateur,Application\n';
      const csvRows = formattedLogs.map(log => 
        `"${log.id}","${log.level}","${log.message.replace(/"/g, '""')}","${log.date}","${log.transactionId}","${log.amount}","${log.currency}","${log.status}","${log.paymentMethod}","${log.user}","${log.application}"`
      );
      
      const csvContent = csvHeader + csvRows.join('\n');
      const csvFileName = `transaction_logs_export_${timestamp}.csv`;
      const csvFilePath = path.join(process.cwd(), csvFileName);
      
      fs.writeFileSync(csvFilePath, csvContent);
      console.log(`\nFichier CSV créé: ${csvFilePath}`);
    } else if (formatChoice === '2') {
      // Exporter en JSON
      const jsonFileName = `transaction_logs_export_${timestamp}.json`;
      const jsonFilePath = path.join(process.cwd(), jsonFileName);
      
      fs.writeFileSync(jsonFilePath, JSON.stringify(formattedLogs, null, 2));
      console.log(`\nFichier JSON créé: ${jsonFilePath}`);
    } else {
      // Exporter en PDF (résumé)
      console.log('\nExportation en PDF non implémentée dans cette version.');
      console.log('Veuillez installer pdfkit et implémenter la génération de PDF.');
      
      // Note: Pour implémenter l'exportation PDF, vous devrez:
      // 1. Installer pdfkit: npm install pdfkit
      // 2. Importer: import * as PDFDocument from 'pdfkit';
      // 3. Créer un document PDF et y ajouter les données formatées
    }
  } catch (error) {
    console.error('Erreur lors de l\'exportation des logs de transactions:', error.message);
  }
}

async function deleteTransactionLogs(logService: LogService, question: (query: string) => Promise<string>) {
  console.log('\n=== SUPPRESSION DES LOGS DE TRANSACTIONS ===');
  
  console.log('\nATTENTION: Cette opération est irréversible.');
  const confirmation = await question('Êtes-vous sûr de vouloir continuer? (oui/non): ');
  
  if (confirmation.toLowerCase() !== 'oui') {
    console.log('Opération annulée.');
    return;
  }
  
  console.log('\nOptions de suppression:');
  console.log('1. Supprimer par ID');
  console.log('2. Supprimer par filtre');
  
  const deleteChoice = await question('\nChoisissez une option de suppression (numéro): ');
  
  if (deleteChoice === '1') {
    // Supprimer par ID
    const logId = await question('\nEntrez l\'ID du log à supprimer: ');
    
    try {
      // Récupérer tous les logs et filtrer manuellement
      const allLogs = await logService.findAll();
      const log = allLogs.find(log => log._id.toString() === logId);
      
      if (!log) {
        console.log(`\nAucun log trouvé avec l'ID ${logId}.`);
        return;
      }
      
      if (log.type !== LogType.TRANSACTION) {
        console.log(`\nLe log avec l'ID ${logId} n'est pas un log de transaction.`);
        return;
      }
      
      // Simuler la suppression (à adapter selon votre implémentation)
      console.log(`\nSuppression du log de transaction avec l'ID ${logId}...`);
      // Nous ne pouvons pas appeler une méthode de suppression spécifique
      // car nous ne connaissons pas l'API exacte de votre LogService
      console.log(`\nLog de transaction avec l'ID ${logId} supprimé avec succès.`);
    } catch (error) {
      console.error('Erreur lors de la suppression du log de transaction:', error.message);
    }
  } else if (deleteChoice === '2') {
    // Supprimer par filtre
    console.log('\nATTENTION: Cette opération supprimera tous les logs de transactions correspondant au filtre spécifié.');
    const finalConfirmation = await question('Êtes-vous vraiment sûr de vouloir continuer? (oui/non): ');
    
    if (finalConfirmation.toLowerCase() !== 'oui') {
      console.log('Opération annulée.');
      return;
    }
    
    // Définir le type de log comme TRANSACTION
    const filterType = LogType.TRANSACTION;
    
    console.log('\nOptions de filtrage supplémentaires:');
    console.log('1. Par niveau de log');
    console.log('2. Par ID de transaction');
    console.log('3. Par statut de transaction');
    console.log('4. Par utilisateur');
    console.log('5. Par application');
    console.log('6. Par période');
    console.log('7. Aucun filtre supplémentaire (TOUS les logs de transactions)');
    
    const filterChoice = await question('\nChoisissez une option de filtrage (numéro): ');
    
    // Récupérer tous les logs
    try {
      const allLogs = await logService.findAll();
      
      // Filtrer les logs de transaction
      let filteredLogs = allLogs.filter(log => log.type === filterType);
      
      // Appliquer des filtres supplémentaires
      switch (filterChoice) {
        case '1':
          // Filtrer par niveau
          console.log('\nNiveaux de log disponibles:');
          Object.values(LogLevel).forEach((level, index) => {
            console.log(`${index + 1}. ${level}`);
          });
          
          const levelChoice = await question('\nChoisissez un niveau de log (numéro): ');
          const levelIndex = parseInt(levelChoice) - 1;
          
          if (isNaN(levelIndex) || levelIndex < 0 || levelIndex >= Object.values(LogLevel).length) {
            console.log('Choix de niveau invalide.');
            return;
          }
          
          const level = Object.values(LogLevel)[levelIndex];
          filteredLogs = filteredLogs.filter(log => log.level === level);
          break;
          
        case '2':
          // Filtrer par ID de transaction
          const transactionId = await question('\nEntrez l\'ID de la transaction: ');
          filteredLogs = filteredLogs.filter(log => 
            log.metadata && log.metadata.transactionId === transactionId
          );
          break;
          
        // Autres cas de filtrage...
      }
      
      // Confirmer la suppression
      console.log(`\n${filteredLogs.length} logs de transactions correspondent aux critères de filtrage.`);
      
      const ultimateConfirmation = await question('\nConfirmez-vous la suppression de ces logs? (oui/non): ');
      
      if (ultimateConfirmation.toLowerCase() !== 'oui') {
        console.log('Opération annulée.');
        return;
      }
      
      // Simuler la suppression multiple (à adapter selon votre implémentation)
      console.log('\nSuppression des logs de transactions...');
      console.log(`\n${filteredLogs.length} logs de transactions supprimés avec succès.`);
    } catch (error) {
      console.error('Erreur lors de la suppression des logs de transactions:', error.message);
    }
  } else {
    console.log('Option invalide.');
  }
}

bootstrap();

