import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument } from '../schemas/log.schema';
import { CreateLogDto } from '../dto/create-log.dto';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

@Injectable()
export class LogService {
  constructor(
    @InjectModel(Log.name) private logModel: Model<LogDocument>
  ) {}

  /**
   * Limite la taille d'un objet pour éviter de dépasser la limite BSON de MongoDB
   * @param obj Objet à limiter
   * @param maxSize Taille maximale en caractères pour les chaînes
   * @param depth Profondeur actuelle de récursion
   * @param maxDepth Profondeur maximale de récursion
   * @returns Objet limité en taille
   */
  private limitObjectSize(obj: any, maxSize = 10000, depth = 0, maxDepth = 5): any {
    if (depth > maxDepth) {
      return '[Objet trop profond]';
    }

    if (obj === null || obj === undefined) {
      return obj;
    }

    if (typeof obj === 'string') {
      if (obj.length > maxSize) {
        return obj.substring(0, maxSize) + '... [tronqué]';
      }
      return obj;
    }

    if (typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      // Limiter la taille du tableau à 1000 éléments
      const limitedArray = obj.slice(0, 1000).map(item => 
        this.limitObjectSize(item, maxSize, depth + 1, maxDepth)
      );
      
      if (obj.length > 1000) {
        limitedArray.push(`... [${obj.length - 1000} éléments supplémentaires tronqués]`);
      }
      
      return limitedArray;
    }

    const result = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        result[key] = this.limitObjectSize(obj[key], maxSize, depth + 1, maxDepth);
      }
    }
    return result;
  }

  /**
   * Récupère tous les logs avec filtrage et pagination
   * @param filter Filtre à appliquer
   * @param limit Nombre maximum de logs à récupérer
   * @param skip Nombre de logs à sauter
   * @returns Liste des logs
   */
  async findAll(filter: any = {}, limit?: number, skip?: number): Promise<LogDocument[]> {
    // Traiter les filtres de date si présents
    if (filter.dateRange) {
      filter.createdAt = {};
      
      if (filter.dateRange.start) {
        filter.createdAt.$gte = new Date(filter.dateRange.start);
      }
      
      if (filter.dateRange.end) {
        filter.createdAt.$lte = new Date(filter.dateRange.end);
      }
      
      // Supprimer le champ dateRange du filtre
      delete filter.dateRange;
    }
    
    // Construire la requête
    const query = this.logModel.find(filter);
    
    // Appliquer la pagination
    if (skip !== undefined && skip !== null) {
      query.skip(skip);
    }
    
    if (limit !== undefined && limit !== null && limit > 0) {
      query.limit(limit);
    }
    
    // Trier par date de création décroissante
    // Ajouter l'option allowDiskUse pour permettre le tri externe
    query.sort({ createdAt: -1 }).allowDiskUse(true);
    
    return query.exec();
  }

  /**
   * Compte le nombre total de logs correspondant au filtre
   * @param filter Filtre à appliquer
   * @returns Nombre total de logs
   */
  async count(filter: any = {}): Promise<number> {
    // Traiter les filtres de date si présents
    if (filter.dateRange) {
      filter.createdAt = {};
      
      if (filter.dateRange.start) {
        filter.createdAt.$gte = new Date(filter.dateRange.start);
      }
      
      if (filter.dateRange.end) {
        filter.createdAt.$lte = new Date(filter.dateRange.end);
      }
      
      // Supprimer le champ dateRange du filtre
      delete filter.dateRange;
    }
    
    return this.logModel.countDocuments(filter).exec();
  }

  /**
   * Récupère un log par son ID
   * @param id ID du log
   * @returns Le log trouvé ou null
   */
  async findById(id: string): Promise<LogDocument> {
    return this.logModel.findById(id).exec();
  }

  /**
   * Crée un nouveau log avec limitation de taille
   * @param createLogDto DTO pour la création du log
   * @returns Le log créé
   */
  async create(createLogDto: CreateLogDto): Promise<LogDocument> {
    // Limiter la taille du message
    if (createLogDto.message && createLogDto.message.length > 10000) {
      createLogDto.message = createLogDto.message.substring(0, 10000) + '... [tronqué]';
    }
    
    // Limiter la taille des métadonnées
    if (createLogDto.metadata) {
      createLogDto.metadata = this.limitObjectSize(createLogDto.metadata);
    }
    
    const log = new this.logModel(createLogDto);
    return log.save();
  }

  /**
   * Supprime un log par son ID
   * @param id ID du log à supprimer
   * @returns Résultat de la suppression
   */
  async delete(id: string): Promise<any> {
    return this.logModel.findByIdAndDelete(id).exec();
  }

  /**
   * Crée un log d'action formaté
   * @param action Action effectuée
   * @param details Détails de l'action
   * @param userId Utilisateur qui a effectué l'action
   * @param metadata Métadonnées supplémentaires
   */
  async createActionLog(
    action: string,
    details: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<LogDocument> {
    const actionMessage = this.formatActionMessage(action, details, metadata);
    
    const createLogDto: CreateLogDto = {
      level: LogLevel.INFO,
      type: LogType.ACTION,
      message: actionMessage,
      user: userId,
      metadata: {
        action,
        details,
        timestamp: new Date().toISOString(),
        ...metadata
      }
    };
    
    return this.create(createLogDto);
  }

  /**
   * Formate le message d'action de manière standardisée selon le type d'opération
   */
  private formatActionMessage(action: string, details: string, metadata?: Record<string, any>): string {
    const timestamp = new Date().toLocaleString('fr-FR');
    const user = metadata?.userId || metadata?.user || 'SYSTÈME';
    
    // Format plus clair: [DATE] UTILISATEUR a effectué ACTION - DÉTAILS
    let message = `[${timestamp}] ${user} a effectué ${action}`;
    
    if (details) {
      message += ` - ${details}`;
    }
    
    // Ajouter contexte spécifique
    if (metadata?.transactionId) {
      message += ` | Transaction: ${metadata.transactionId}`;
    }
    
    if (metadata?.amount) {
      message += ` | Montant: ${metadata.amount} ${metadata.currency || 'XAF'}`;
    }
    
    return message;
  }

  /**
   * Détermine le type d'opération à afficher dans le log
   */
  private getOperationType(action: string, metadata?: Record<string, any>): string {
    // Vérifier d'abord les métadonnées pour le type de transaction
    if (metadata?.type) {
      switch (metadata.type.toLowerCase()) {
        case 'deposit':
        case 'depot':
          return 'DEPOT';
        case 'withdrawal':
        case 'retrait':
          return 'RETRAIT';
        case 'transfer':
        case 'transfert':
          return 'TRANSFERT';
        case 'payment':
        case 'paiement':
          return 'PAIEMENT';
        case 'refund':
        case 'remboursement':
          return 'REMBOURSEMENT';
      }
    }
    
    // Vérifier l'action pour déterminer le type
    const actionLower = action.toLowerCase();
    
    if (actionLower.includes('deposit') || actionLower.includes('depot')) {
      return 'DEPOT';
    }
    
    if (actionLower.includes('withdrawal') || actionLower.includes('retrait')) {
      return 'RETRAIT';
    }
    
    if (actionLower.includes('transfer') || actionLower.includes('transfert')) {
      return 'TRANSFERT';
    }
    
    if (actionLower.includes('payment') || actionLower.includes('paiement')) {
      return 'PAIEMENT';
    }
    
    if (actionLower.includes('refund') || actionLower.includes('remboursement')) {
      return 'REMBOURSEMENT';
    }
    
    if (actionLower.includes('login') || actionLower.includes('connexion')) {
      return 'CONNEXION';
    }
    
    if (actionLower.includes('logout') || actionLower.includes('deconnexion')) {
      return 'DECONNEXION';
    }
    
    // Par défaut, retourner l'action en majuscules
    return action.toUpperCase();
  }
}










