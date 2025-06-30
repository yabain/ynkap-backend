import { Injectable } from '@nestjs/common';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as PDFDocument from 'pdfkit';
import * as ExcelJS from 'exceljs';
import { createObjectCsvWriter } from 'csv-writer';
import { TransactionLogDocument } from '../schemas/transaction-log.schema';

@Injectable()
export class TransactionLogExportService {
  private readonly tempDir = path.join(process.cwd(), 'temp');

  constructor() {
    // Assurer que le répertoire temporaire existe
    fs.ensureDirSync(this.tempDir);
  }

  /**
   * Exporte les logs de transaction au format CSV
   */
  async exportToCsv(logs: TransactionLogDocument[]): Promise<string> {
    const fileName = `transaction_logs_${Date.now()}.csv`;
    const filePath = path.join(this.tempDir, fileName);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: 'transactionId', title: 'ID Transaction' },
        { id: 'applicationId', title: 'ID Application' },
        { id: 'state', title: 'État' },
        { id: 'type', title: 'Type' },
        { id: 'amount', title: 'Montant' },
        { id: 'paymentMode', title: 'Mode de paiement' },
        { id: 'userId', title: 'Utilisateur' },
        { id: 'timestamp', title: 'Date et heure' }
      ]
    });

    const records = logs.map(log => ({
      transactionId: log.transactionId,
      applicationId: log.applicationId,
      state: log.state,
      type: log.type || '-',
      amount: log.amount || '-',
      paymentMode: log.paymentMode || '-',
      userId: log.userId || 'anonymous',
      timestamp: new Date(log.timestamp).toLocaleString()
    }));

    await csvWriter.writeRecords(records);
    return filePath;
  }

  /**
   * Exporte les logs de transaction au format Excel
   */
  async exportToExcel(logs: TransactionLogDocument[]): Promise<string> {
    const fileName = `transaction_logs_${Date.now()}.xlsx`;
    const filePath = path.join(this.tempDir, fileName);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transaction Logs');

    worksheet.columns = [
      { header: 'ID Transaction', key: 'transactionId', width: 30 },
      { header: 'ID Application', key: 'applicationId', width: 30 },
      { header: 'État', key: 'state', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Montant', key: 'amount', width: 15 },
      { header: 'Mode de paiement', key: 'paymentMode', width: 20 },
      { header: 'Utilisateur', key: 'userId', width: 20 },
      { header: 'Date et heure', key: 'timestamp', width: 20 }
    ];

    logs.forEach(log => {
      worksheet.addRow({
        transactionId: log.transactionId,
        applicationId: log.applicationId,
        state: log.state,
        type: log.type || '-',
        amount: log.amount || '-',
        paymentMode: log.paymentMode || '-',
        userId: log.userId || 'anonymous',
        timestamp: new Date(log.timestamp).toLocaleString()
      });
    });

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  /**
   * Exporte les logs de transaction au format PDF
   */
  async exportToPdf(logs: TransactionLogDocument[]): Promise<string> {
    const fileName = `transaction_logs_${Date.now()}.pdf`;
    const filePath = path.join(this.tempDir, fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(filePath);

        doc.pipe(stream);

        // Titre
        doc.fontSize(20).text('Rapport des logs de transaction', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Généré le ${new Date().toLocaleString()}`, { align: 'center' });
        doc.moveDown(2);

        // Tableau des logs
        const tableTop = 150;
        const tableLeft = 50;
        const colWidths = [80, 80, 60, 60, 60, 80, 80];
        const rowHeight = 30;

        // En-têtes
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('ID Transaction', tableLeft, tableTop);
        doc.text('ID Application', tableLeft + colWidths[0], tableTop);
        doc.text('État', tableLeft + colWidths[0] + colWidths[1], tableTop);
        doc.text('Type', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], tableTop);
        doc.text('Montant', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], tableTop);
        doc.text('Mode de paiement', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], tableTop);
        doc.text('Date', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5], tableTop);

        // Lignes
        doc.fontSize(8).font('Helvetica');
        let y = tableTop + rowHeight;

        logs.slice(0, 20).forEach(log => {
          // Vérifier si on a besoin d'une nouvelle page
          if (y > 700) {
            doc.addPage();
            y = 50;
          }

          doc.text(log.transactionId.substring(0, 10) + '...', tableLeft, y);
          doc.text(log.applicationId.substring(0, 10) + '...', tableLeft + colWidths[0], y);
          doc.text(log.state, tableLeft + colWidths[0] + colWidths[1], y);
          doc.text(log.type || '-', tableLeft + colWidths[0] + colWidths[1] + colWidths[2], y);
          doc.text(log.amount?.toString() || '-', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3], y);
          doc.text(log.paymentMode || '-', tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4], y);
          doc.text(new Date(log.timestamp).toLocaleDateString(), tableLeft + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5], y);

          y += rowHeight;
        });

        // Note sur la limitation
        if (logs.length > 20) {
          doc.moveDown(2);
          doc.fontSize(10).text(`Note: Ce rapport contient les 20 premiers logs sur un total de ${logs.length}.`, { align: 'center' });
        }

        doc.end();

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
}