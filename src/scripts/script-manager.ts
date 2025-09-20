/**
 * Gestionnaire centralisé pour tous les scripts
 * Exécuter avec: npm run scripts
 */

import * as readline from 'readline';
import { spawn } from 'child_process';
import * as path from 'path';

interface ScriptInfo {
  name: string;
  description: string;
  command: string;
  category: string;
}

const scripts: ScriptInfo[] = [
  // Scripts de transactions
  {
    name: 'check-transactions',
    description: 'Vérifier les transactions dans la base de données',
    command: 'check:transactions',
    category: 'Transactions'
  },
  {
    name: 'fetch-transactions',
    description: 'Récupérer l\'historique des transactions',
    command: 'fetch:transactions',
    category: 'Transactions'
  },
  {
    name: 'diagnose-transactions',
    description: 'Diagnostiquer les problèmes de transactions',
    command: 'diagnose:transactions',
    category: 'Transactions'
  },
  {
    name: 'seed-transactions',
    description: 'Créer des transactions de test',
    command: 'seed:transactions-simple',
    category: 'Transactions'
  },

  // Scripts de paiements
  {
    name: 'payment-history',
    description: 'Récupérer l\'historique des paiements',
    command: 'history:payments',
    category: 'Paiements'
  },
  {
    name: 'test-payment-methods',
    description: 'Tester les méthodes de paiement',
    command: 'test:payment-methods',
    category: 'Paiements'
  },
  {
    name: 'test-wallet-payment',
    description: 'Tester les paiements wallet',
    command: 'test:wallet-payment',
    category: 'Paiements'
  },
  {
    name: 'test-production-payment',
    description: 'Tester les paiements en production',
    command: 'test:payment-prod',
    category: 'Paiements'
  },

  // Scripts MTN
  {
    name: 'generate-mtn-prod-keys',
    description: 'Générer les clés MTN Money (prod)',
    command: 'generate:mtn-prod-keys',
    category: 'MTN'
  },
  {
    name: 'test-mtn-routes',
    description: 'Tester les routes MTN en production',
    command: 'test:mtn-routes-prod',
    category: 'MTN'
  },
  {
    name: 'test-mtn-prod',
    description: 'Tester MTN en production',
    command: 'test:mtn-prod',
    category: 'MTN'
  },
  {
    name: 'test-mtn-connectivity',
    description: 'Tester la connectivité MTN',
    command: 'test:mtn-connectivity',
    category: 'MTN'
  },

  // Scripts Orange Money
  {
    name: 'test-orange-prod',
    description: 'Tester Orange Money en production',
    command: 'test:orange-prod',
    category: 'Orange Money'
  },

  // Scripts de logs
  {
    name: 'test-logs',
    description: 'Tester le système de logs',
    command: 'test:logs',
    category: 'Logs'
  },
  {
    name: 'test-transaction-logs',
    description: 'Tester les logs de transactions',
    command: 'test:transaction-logs',
    category: 'Logs'
  },
  {
    name: 'convert-logs-capped',
    description: 'Convertir les logs en collection cappée',
    command: 'convert:logs-to-capped',
    category: 'Logs'
  },

  // Scripts d'applications
  {
    name: 'extract-app-keys',
    description: 'Extraire les clés d\'une application',
    command: 'extract:app-keys',
    category: 'Applications'
  },
  {
    name: 'generate-app-test-keys',
    description: 'Générer de nouvelles clés de test pour une application',
    command: 'generate:app-test-keys',
    category: 'Applications'
  },
  {
    name: 'debug-auth',
    description: 'Déboguer l\'authentification des applications',
    command: 'debug:auth',
    category: 'Applications'
  },

  // Scripts de monitoring et maintenance
  {
    name: 'cron-check-pending',
    description: 'Déclencher manuellement la vérification des transactions PENDING',
    command: 'start:dev --exec "curl -X POST http://localhost:3000/transaction-status-checker/trigger-manual-check"',
    category: 'Monitoring'
  },
  {
    name: 'cron-stats',
    description: 'Voir les statistiques des transactions PENDING',
    command: 'start:dev --exec "curl http://localhost:3000/transaction-status-checker/pending-stats"',
    category: 'Monitoring'
  },
  {
    name: 'cron-status',
    description: 'Vérifier le statut du Cron Job',
    command: 'start:dev --exec "curl http://localhost:3000/transaction-status-checker/cron-status"',
    category: 'Monitoring'
  }
];

class ScriptManager {
  private rl: readline.Interface;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('🚀 GESTIONNAIRE DE SCRIPTS Y-NKAP 🚀\n');
    
    let exit = false;
    while (!exit) {
      console.log('='.repeat(60));
      console.log('MENU PRINCIPAL');
      console.log('='.repeat(60));
      console.log('1. 📊 Scripts de Transactions');
      console.log('2. 💳 Scripts de Paiements');
      console.log('3. 📱 Scripts MTN Money');
      console.log('4. 🍊 Scripts Orange Money');
      console.log('5. 📝 Scripts de Logs');
      console.log('6. 🔧 Scripts d\'Applications');
      console.log('7. 📈 Scripts de Monitoring');
      console.log('8. 📋 Voir tous les scripts');
      console.log('9. 🔍 Rechercher un script');
      console.log('10. ❌ Quitter');
      console.log('='.repeat(60));

      const choice = await this.question('\n👉 Choisissez une option (1-10): ');

      switch (choice) {
        case '1':
          await this.showCategoryScripts('Transactions');
          break;
        case '2':
          await this.showCategoryScripts('Paiements');
          break;
        case '3':
          await this.showCategoryScripts('MTN');
          break;
        case '4':
          await this.showCategoryScripts('Orange Money');
          break;
        case '5':
          await this.showCategoryScripts('Logs');
          break;
        case '6':
          await this.showCategoryScripts('Applications');
          break;
        case '7':
          await this.showCategoryScripts('Monitoring');
          break;
        case '8':
          await this.showAllScripts();
          break;
        case '9':
          await this.searchScripts();
          break;
        case '10':
          exit = true;
          break;
        default:
          console.log('❌ Option invalide. Veuillez réessayer.\n');
      }
    }

    this.rl.close();
    console.log('\n👋 Au revoir !');
  }

  private async showCategoryScripts(category: string) {
    const categoryScripts = scripts.filter(s => s.category === category);
    
    console.log(`\n📂 SCRIPTS ${category.toUpperCase()}`);
    console.log('='.repeat(50));
    
    categoryScripts.forEach((script, index) => {
      console.log(`${index + 1}. ${script.name}`);
      console.log(`   📝 ${script.description}`);
      console.log(`   ⚡ ${script.command}\n`);
    });

    console.log(`${categoryScripts.length + 1}. 🔙 Retour au menu principal`);
    
    const choice = await this.question(`\n👉 Choisissez un script (1-${categoryScripts.length + 1}): `);
    const choiceNum = parseInt(choice);

    if (choiceNum > 0 && choiceNum <= categoryScripts.length) {
      await this.executeScript(categoryScripts[choiceNum - 1]);
    } else if (choiceNum === categoryScripts.length + 1) {
      return;
    } else {
      console.log('❌ Choix invalide.\n');
    }
  }

  private async showAllScripts() {
    console.log('\n📋 TOUS LES SCRIPTS DISPONIBLES');
    console.log('='.repeat(60));
    
    const categories = [...new Set(scripts.map(s => s.category))];
    
    categories.forEach(category => {
      console.log(`\n📂 ${category.toUpperCase()}`);
      console.log('-'.repeat(30));
      
      const categoryScripts = scripts.filter(s => s.category === category);
      categoryScripts.forEach((script, index) => {
        console.log(`  ${index + 1}. ${script.name} - ${script.description}`);
      });
    });

    await this.question('\n👉 Appuyez sur Entrée pour continuer...');
  }

  private async searchScripts() {
    const searchTerm = await this.question('\n🔍 Entrez un terme de recherche: ');
    
    const results = scripts.filter(script => 
      script.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      script.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (results.length === 0) {
      console.log('❌ Aucun script trouvé.\n');
      return;
    }

    console.log(`\n🎯 RÉSULTATS DE RECHERCHE (${results.length} trouvé(s))`);
    console.log('='.repeat(50));
    
    results.forEach((script, index) => {
      console.log(`${index + 1}. ${script.name} (${script.category})`);
      console.log(`   📝 ${script.description}`);
      console.log(`   ⚡ ${script.command}\n`);
    });

    console.log(`${results.length + 1}. 🔙 Retour au menu principal`);
    
    const choice = await this.question(`\n👉 Choisissez un script (1-${results.length + 1}): `);
    const choiceNum = parseInt(choice);

    if (choiceNum > 0 && choiceNum <= results.length) {
      await this.executeScript(results[choiceNum - 1]);
    }
  }

  private async executeScript(script: ScriptInfo) {
    console.log(`\n🚀 EXÉCUTION: ${script.name}`);
    console.log(`📝 Description: ${script.description}`);
    console.log(`⚡ Commande: ${script.command}`);
    console.log('='.repeat(60));

    const confirm = await this.question('\n❓ Voulez-vous exécuter ce script ? (o/N): ');
    
    if (confirm.toLowerCase() !== 'o' && confirm.toLowerCase() !== 'oui') {
      console.log('❌ Exécution annulée.\n');
      return;
    }

    console.log('\n⏳ Exécution en cours...\n');

    return new Promise<void>((resolve) => {
      const child = spawn('npm', ['run', script.command.replace('npm run ', '')], {
        stdio: 'inherit',
        shell: true
      });

      child.on('close', (code) => {
        if (code === 0) {
          console.log('\n✅ Script exécuté avec succès !');
        } else {
          console.log(`\n❌ Script terminé avec le code d'erreur: ${code}`);
        }
        
        this.question('\n👉 Appuyez sur Entrée pour continuer...').then(() => {
          resolve();
        });
      });

      child.on('error', (error) => {
        console.error(`\n❌ Erreur lors de l'exécution: ${error.message}`);
        resolve();
      });
    });
  }

  private question(prompt: string): Promise<string> {
    return new Promise((resolve) => {
      this.rl.question(prompt, resolve);
    });
  }
}

// Démarrer le gestionnaire
const manager = new ScriptManager();
manager.start().catch(console.error);
