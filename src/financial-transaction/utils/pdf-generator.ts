import * as PDFDocument from 'pdfkit';
import * as fs from 'fs-extra';
import * as path from 'path';
import { TransactionStatsDTO } from '../dtos/transaction-stats.dto';

export class PdfGenerator {
    /**
     * Génère un rapport PDF des statistiques financières
     * @param stats Statistiques à inclure dans le rapport
     * @param options Options de génération du PDF
     * @returns Chemin du fichier PDF généré
     */
    static async generateStatsPdf(stats: TransactionStatsDTO, options: any): Promise<string> {
        return new Promise((resolve, reject) => {
            try {
                // Créer un dossier temporaire pour les fichiers générés
                const tempDir = path.join(process.cwd(), 'temp');
                fs.ensureDirSync(tempDir);
                
                // Nom du fichier
                const fileName = `${options.fileName || 'financial_stats'}_${new Date().getTime()}.pdf`;
                const filePath = path.join(tempDir, fileName);
                
                // Créer un nouveau document PDF
                const doc = new PDFDocument({ margin: 50 });
                
                // Pipe le PDF vers un fichier
                const stream = fs.createWriteStream(filePath);
                doc.pipe(stream);
                
                // Ajouter un titre
                doc.fontSize(25).text('Rapport de Statistiques Financières', {
                    align: 'center'
                });
                
                // Ajouter la date du rapport
                doc.moveDown();
                doc.fontSize(12).text(`Généré le: ${new Date().toLocaleString()}`, {
                    align: 'center'
                });
                
                // Ajouter la période du rapport
                if (options.startDate && options.endDate) {
                    doc.moveDown();
                    doc.fontSize(12).text(`Période: ${new Date(options.startDate).toLocaleDateString()} - ${new Date(options.endDate).toLocaleDateString()}`, {
                        align: 'center'
                    });
                }
                
                // Ajouter un séparateur
                doc.moveDown();
                doc.moveTo(50, doc.y)
                   .lineTo(doc.page.width - 50, doc.y)
                   .stroke();
                doc.moveDown();
                
                // Ajouter les statistiques principales
                doc.fontSize(18).text('Statistiques Principales', {
                    underline: true
                });
                doc.moveDown();
                
                // Tableau des statistiques
                const tableData = [
                    ['Métrique', 'Valeur'],
                    ['Transactions Totales', stats.totalTransactions.toString()],
                    ['Montant Total', `${stats.totalAmount} XAF`],
                    ['Taux de Succès', `${stats.successRate.toFixed(2)}%`],
                    ['Transactions Réussies', stats.successfulTransactions.toString()],
                    ['Transactions en Attente', stats.pendingTransactions.toString()],
                    ['Transactions Échouées', stats.failedTransactions.toString()]
                ];
                
                this.drawTable(doc, tableData);
                
                // Ajouter les statistiques de dépôt et retrait
                doc.addPage();
                doc.fontSize(18).text('Dépôts et Retraits', {
                    underline: true
                });
                doc.moveDown();
                
                const depositWithdrawalData = [
                    ['Métrique', 'Dépôts', 'Retraits'],
                    ['Nombre', stats.deposits.toString(), stats.withdrawals.toString()],
                    ['Montant', `${stats.depositAmount} XAF`, `${stats.withdrawalAmount} XAF`],
                    ['Pourcentage', `${(stats.deposits / (stats.totalTransactions || 1) * 100).toFixed(2)}%`, `${(stats.withdrawals / (stats.totalTransactions || 1) * 100).toFixed(2)}%`]
                ];
                
                this.drawTable(doc, depositWithdrawalData);
                
                // Finaliser le document
                doc.end();
                
                // Attendre que le stream soit fermé
                stream.on('finish', () => {
                    resolve(filePath);
                });
                
                stream.on('error', (err) => {
                    reject(err);
                });
                
            } catch (error) {
                reject(error);
            }
        });
    }
    
    /**
     * Dessine un tableau dans le document PDF
     * @param doc Document PDF
     * @param data Données du tableau
     */
    private static drawTable(doc: PDFKit.PDFDocument, data: string[][]) {
        const tableTop = doc.y;
        const tableLeft = 50;
        const cellPadding = 10;
        const columnWidth = (doc.page.width - 100) / data[0].length;
        
        // Dessiner l'en-tête
        doc.font('Helvetica-Bold');
        doc.fontSize(12);
        
        for (let i = 0; i < data[0].length; i++) {
            doc.text(
                data[0][i],
                tableLeft + i * columnWidth + cellPadding,
                tableTop + cellPadding,
                { width: columnWidth - 2 * cellPadding, align: 'left' }
            );
        }
        
        // Dessiner une ligne sous l'en-tête
        doc.moveTo(tableLeft, tableTop + 30)
           .lineTo(tableLeft + columnWidth * data[0].length, tableTop + 30)
           .stroke();
        
        // Dessiner les données
        doc.font('Helvetica');
        for (let i = 1; i < data.length; i++) {
            const rowTop = tableTop + 30 + (i - 1) * 20;
            
            for (let j = 0; j < data[i].length; j++) {
                doc.text(
                    data[i][j],
                    tableLeft + j * columnWidth + cellPadding,
                    rowTop + cellPadding,
                    { width: columnWidth - 2 * cellPadding, align: 'left' }
                );
            }
        }
        
        // Mettre à jour la position Y
        doc.y = tableTop + 30 + (data.length - 1) * 20 + 20;
    }
}