import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { FinancialTransactionService } from '../financial-transaction/services';
import { ApplicationService } from '../application/services';
import mongoose from 'mongoose';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

async function bootstrap() {
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    
    const financialTransactionService = app.get(FinancialTransactionService);
    const applicationService = app.get(ApplicationService);
    
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
    
    console.log('=== RÉCUPÉRATION DE L\'HISTORIQUE DES PAIEMENTS ===\n');
    
    // Récupérer toutes les applications
    const applications = await applicationService.findAll();
    
    if (applications.length === 0) {
      console.log('Aucune application trouvée dans la base de données.');
      await app.close();
      rl.close();
      return;
    }
    
    console.log('Applications disponibles:');
    applications.forEach((app, index) => {
      console.log(`${index + 1}. ${app.name} (ID: ${app._id})`);
    });
    console.log(`${applications.length + 1}. Toutes les applications`);
    
    // Demander à l'utilisateur de choisir une application
    const choice = await question('\nChoisissez une application (numéro) ou "q" pour quitter: ');
    
    if (choice.toLowerCase() === 'q') {
      console.log('Opération annulée.');
      await app.close();
      rl.close();
      return;
    }
    
    const choiceNum = parseInt(choice);
    
    if (isNaN(choiceNum) || choiceNum < 1 || choiceNum > applications.length + 1) {
      console.log('Choix invalide.');
      await app.close();
      rl.close();
      return;
    }
    
    // Demander la période
    console.log('\nPériode de recherche:');
    console.log('1. Aujourd\'hui');
    console.log('2. Cette semaine');
    console.log('3. Ce mois');
    console.log('4. Les 3 derniers mois');
    console.log('5. Les 6 derniers mois');
    console.log('6. Toute la période');
    console.log('7. Période personnalisée');
    
    const periodChoice = await question('\nChoisissez une période (numéro): ');
    const periodNum = parseInt(periodChoice);
    
    if (isNaN(periodNum) || periodNum < 1 || periodNum > 7) {
      console.log('Choix de période invalide.');
      await app.close();
      rl.close();
      return;
    }
    
    // Calculer les dates de début et de fin en fonction de la période choisie
    const now = new Date();
    let startDate: Date | null = null;
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
      case 5: // Les 6 derniers mois
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 6);
        break;
      case 6: // Toute la période
        startDate = null;
        break;
      case 7: // Période personnalisée
        const startDateStr = await question('\nDate de début (YYYY-MM-DD): ');
        const endDateStr = await question('Date de fin (YYYY-MM-DD): ');
        
        try {
          startDate = new Date(startDateStr);
          endDate = new Date(endDateStr);
          endDate.setHours(23, 59, 59, 999);
          
          if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            throw new Error('Format de date invalide');
          }
        } catch (error) {
          console.log('Format de date invalide. Utilisation de toute la période.');
          startDate = null;
        }
        break;
    }
    
    // Construire le filtre de recherche
    let filter: any = {};
    
    // Filtrer par application si une application spécifique est choisie
    if (choiceNum <= applications.length) {
      const selectedApp = applications[choiceNum - 1];
      filter.application = new mongoose.Types.ObjectId(selectedApp._id.toString());
      console.log(`\nRécupération des transactions pour l'application: ${selectedApp.name}`);
    } else {
      console.log('\nRécupération des transactions pour toutes les applications');
    }
    
    // Ajouter le filtre de date si nécessaire
    if (startDate) {
      filter.createdAt = { $gte: startDate, $lte: endDate };
      console.log(`Période: du ${startDate.toLocaleDateString()} au ${endDate.toLocaleDateString()}`);
    } else {
      console.log('Période: toute la période');
    }
    
    // Récupérer les transactions
    console.log('\nRécupération des transactions...');
    const transactions = await financialTransactionService.findByField(filter);
    
    console.log(`\n${transactions.length} transactions trouvées.`);
    
    if (transactions.length === 0) {
      console.log('Aucune transaction trouvée pour les critères spécifiés.');
      await app.close();
      rl.close();
      return;
    }
    
    // Demander le format de sortie
    console.log('\nFormat de sortie:');
    console.log('1. Afficher dans la console');
    console.log('2. Exporter en CSV');
    console.log('3. Exporter en JSON');
    
    const formatChoice = await question('\nChoisissez un format (numéro): ');
    const formatNum = parseInt(formatChoice);
    
    if (isNaN(formatNum) || formatNum < 1 || formatNum > 3) {
      console.log('Choix de format invalide. Affichage dans la console par défaut.');
    }
    
    // Créer un tableau formaté des transactions
    const formattedTransactions = transactions.map(transaction => {
      // Récupérer le nom de l'application
      const app = applications.find(a => a._id.toString() === transaction.application.toString());
      const appName = app ? app.name : 'Application inconnue';
      
      return {
        id: transaction._id.toString(),
        reference: transaction.ref,
        date: new Date(transaction.createdAt).toLocaleString(),
        application: appName,
        montant: `${transaction.amount} ${transaction.moneyCode}`,
        type: transaction.type,
        statut: transaction.state,
        modePaiement: transaction.paymentMode,
        utilisateur: transaction.userRef ? `${transaction.userRef.fullName} (${transaction.userRef.account})` : 'Inconnu',
        raison: transaction.raison || '-'
      };
    });
    
    // Traiter selon le format choisi
    switch (formatNum) {
      case 1: // Afficher dans la console
        console.log('\n=== HISTORIQUE DES TRANSACTIONS ===\n');
        formattedTransactions.forEach((transaction, index) => {
          console.log(`\nTransaction ${index + 1}:`);
          console.log(`- ID: ${transaction.id}`);
          console.log(`- Référence: ${transaction.reference}`);
          console.log(`- Date: ${transaction.date}`);
          console.log(`- Application: ${transaction.application}`);
          console.log(`- Montant: ${transaction.montant}`);
          console.log(`- Type: ${transaction.type}`);
          console.log(`- Statut: ${transaction.statut}`);
          console.log(`- Mode de paiement: ${transaction.modePaiement}`);
          console.log(`- Utilisateur: ${transaction.utilisateur}`);
          console.log(`- Raison: ${transaction.raison}`);
        });
        break;
        
      case 2: // Exporter en CSV
        const csvRows = [];
        
        // En-têtes CSV
        csvRows.push([
          'ID', 'Référence', 'Date', 'Application', 'Montant', 'Type', 
          'Statut', 'Mode de paiement', 'Utilisateur', 'Raison'
        ].join(','));
        
        // Données CSV
        formattedTransactions.forEach(transaction => {
          csvRows.push([
            transaction.id,
            transaction.reference,
            transaction.date,
            transaction.application,
            transaction.montant,
            transaction.type,
            transaction.statut,
            transaction.modePaiement,
            transaction.utilisateur,
            transaction.raison
          ].map(value => `"${value}"`).join(','));
        });
        
        // Écrire le fichier CSV
        const csvContent = csvRows.join('\n');
        const csvFileName = `payment_history_${new Date().toISOString().replace(/:/g, '-')}.csv`;
        const csvFilePath = path.join(process.cwd(), csvFileName);
        
        fs.writeFileSync(csvFilePath, csvContent);
        console.log(`\nFichier CSV créé: ${csvFilePath}`);
        break;
        
      case 3: // Exporter en JSON
        const jsonFileName = `payment_history_${new Date().toISOString().replace(/:/g, '-')}.json`;
        const jsonFilePath = path.join(process.cwd(), jsonFileName);
        
        fs.writeFileSync(jsonFilePath, JSON.stringify(formattedTransactions, null, 2));
        console.log(`\nFichier JSON créé: ${jsonFilePath}`);
        break;
    }
    
    // Afficher des statistiques
    console.log('\n=== STATISTIQUES ===');
    
    // Montant total
    const totalAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
    console.log(`Montant total: ${totalAmount} XAF`);
    
    // Répartition par statut
    const statusCounts = {};
    transactions.forEach(transaction => {
      statusCounts[transaction.state] = (statusCounts[transaction.state] || 0) + 1;
    });
    
    console.log('\nRépartition par statut:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`- ${status}: ${count} (${((count as number) / transactions.length * 100).toFixed(2)}%)`);
    });
    
    // Répartition par mode de paiement
    const paymentModeCounts = {};
    transactions.forEach(transaction => {
      paymentModeCounts[transaction.paymentMode] = (paymentModeCounts[transaction.paymentMode] || 0) + 1;
    });
    
    console.log('\nRépartition par mode de paiement:');
    Object.entries(paymentModeCounts).forEach(([mode, count]) => {
      console.log(`- ${mode}: ${count} (${((count as number) / transactions.length * 100).toFixed(2)}%)`);
    });
    
    await app.close();
    rl.close();
    process.exit(0);
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'historique des paiements:', error);
    process.exit(1);
  }
}

bootstrap();