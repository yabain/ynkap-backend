import { Injectable } from '@nestjs/common';
import { LogService } from './log.service';
import * as fs from 'fs-extra';
import * as path from 'path';
import { createObjectCsvWriter } from 'csv-writer';
import * as ExcelJS from 'exceljs';
import { Log } from '../models/log.schema';

@Injectable()
export class LogExportService {
  constructor(private readonly logService: LogService) {}

  /**
   * Exporte les logs au format CSV
   * @param logs Logs à exporter
   * @param filename Nom du fichier (optionnel)
   * @returns Chemin du fichier exporté
   */
  async exportToCsv(logs: Log[], filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const csvFilename = filename || `logs_export_${timestamp}.csv`;
    const filePath = path.join(process.cwd(), csvFilename);

    const csvWriter = createObjectCsvWriter({
      path: filePath,
      header: [
        { id: '_id', title: 'ID' },
        { id: 'level', title: 'Niveau' },
        { id: 'type', title: 'Type' },
        { id: 'message', title: 'Message' },
        { id: 'user', title: 'Utilisateur' },
        { id: 'timestamp', title: 'Date' },
        { id: 'metadata', title: 'Métadonnées' }
      ]
    });

    // Formater les logs pour l'export CSV
    const formattedLogs = logs.map(log => ({
      _id: log._id.toString(),
      level: log.level,
      type: log.type,
      message: log.message,
      user: log.user || 'N/A',
      timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
      metadata: log.metadata ? JSON.stringify(log.metadata) : 'N/A'
    }));

    await csvWriter.writeRecords(formattedLogs);
    return filePath;
  }

  /**
   * Exporte les logs au format JSON
   * @param logs Logs à exporter
   * @param filename Nom du fichier (optionnel)
   * @returns Chemin du fichier exporté
   */
  async exportToJson(logs: Log[], filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const jsonFilename = filename || `logs_export_${timestamp}.json`;
    const filePath = path.join(process.cwd(), jsonFilename);

    // Formater les logs pour l'export JSON
    const formattedLogs = logs.map(log => ({
      id: log._id.toString(),
      level: log.level,
      type: log.type,
      message: log.message,
      user: log.user || 'N/A',
      timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
      metadata: log.metadata || {}
    }));

    const jsonContent = JSON.stringify({
      data: formattedLogs,
      meta: {
        exportDate: new Date().toISOString(),
        count: formattedLogs.length
      }
    }, null, 2);

    await fs.writeFile(filePath, jsonContent);
    return filePath;
  }

  /**
   * Exporte les logs au format Excel
   * @param logs Logs à exporter
   * @param filename Nom du fichier (optionnel)
   * @returns Chemin du fichier exporté
   */
  async exportToExcel(logs: Log[], filename?: string): Promise<string> {
    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const excelFilename = filename || `logs_export_${timestamp}.xlsx`;
    const filePath = path.join(process.cwd(), excelFilename);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Logs');

    // Définir les colonnes
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 30 },
      { header: 'Niveau', key: 'level', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Message', key: 'message', width: 50 },
      { header: 'Utilisateur', key: 'user', width: 20 },
      { header: 'Date', key: 'timestamp', width: 25 },
      { header: 'Métadonnées', key: 'metadata', width: 50 }
    ];

    // Ajouter les données
    logs.forEach(log => {
      worksheet.addRow({
        id: log._id.toString(),
        level: log.level,
        type: log.type,
        message: log.message,
        user: log.user || 'N/A',
        timestamp: log.timestamp ? new Date(log.timestamp).toISOString() : new Date().toISOString(),
        metadata: log.metadata ? JSON.stringify(log.metadata) : 'N/A'
      });
    });

    // Styliser l'en-tête
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Sauvegarder le fichier
    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }
}



