import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument } from '../schemas/log.schema';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';
import { CreateLogDto } from '../dto/create-log.dto';

@Injectable()
export class TransactionLogService {
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
   * Récupère tous les logs de transactions avec pagination
   * @param limit Nombre maximum de logs à récupérer
   * @param skip Nombre de logs à sauter
   * @returns Liste des logs de transactions
   */
  async findAll(limit?: number, skip?: number): Promise<LogDocument[]> {
    const query = this.logModel.find({ type: LogType.TRANSACTION });
    
    if (skip !== undefined) {
      query.skip(skip);
    }
    
    if (limit !== undefined && limit > 0) {
      query.limit(limit);
    }
    
    // Ajouter allowDiskUse pour permettre le tri externe
    return query.sort({ createdAt: -1 }).allowDiskUse(true).exec();
  }

  /**
   * Compte le nombre total de logs de transactions
   * @returns Nombre total de logs de transactions
   */
  async count(): Promise<number> {
    return this.logModel.countDocuments({ type: LogType.TRANSACTION }).exec();
  }

  /**
   * Crée un nouveau log de transaction avec limitation de taille
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
    
    // S'assurer que le type est TRANSACTION
    const logData = {
      ...createLogDto,
      type: LogType.TRANSACTION
    };
    
    const log = new this.logModel(logData);
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
   * Enregistre un log de transaction avec formatage amélioré
   */
  async logTransaction(
    transactionId: string,
    applicationId: string,
    state: string,
    type: string,
    amount: number,
    paymentMode: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<LogDocument> {
    // Déterminer le type d'opération à afficher
    let operationType = 'TRANSACTION';
    switch (type.toLowerCase()) {
      case 'deposit':
      case 'depot':
        operationType = 'DEPOT';
        break;
      case 'withdrawal':
      case 'retrait':
        operationType = 'RETRAIT';
        break;
      case 'transfer':
      case 'transfert':
        operationType = 'TRANSFERT';
        break;
      case 'payment':
      case 'paiement':
        operationType = 'PAIEMENT';
        break;
    }
    
    const limitedMetadata = metadata ? this.limitObjectSize(metadata) : {};
    
    const log = new this.logModel({
      level: LogLevel.INFO,
      type: LogType.TRANSACTION,
      message: `${operationType} ${transactionId} - État: ${state} - Montant: ${amount} XAF`,
      user: userId,
      metadata: {
        transactionId,
        applicationId,
        state,
        type,
        operationType,
        amount,
        paymentMode,
        ...limitedMetadata
      },
      createdAt: new Date()
    });

    return log.save();
  }

  /**
   * Récupère les logs d'une transaction spécifique
   * @param transactionId ID de la transaction
   */
  async getTransactionLogs(transactionId: string): Promise<LogDocument[]> {
    return this.logModel.find({
      type: LogType.TRANSACTION,
      'metadata.transactionId': transactionId
    }).sort({ createdAt: -1 }).exec();
  }

  /**
   * Enregistre un changement d'état de transaction avec limitation de taille
   * @param transactionId ID de la transaction
   * @param applicationId ID de l'application
   * @param oldState Ancien état
   * @param newState Nouvel état
   * @param userId ID ou nom de l'utilisateur
   */
  async logTransactionStateChange(
    transactionId: string,
    applicationId: string,
    oldState: string,
    newState: string,
    userId?: string
  ): Promise<LogDocument> {
    const log = new this.logModel({
      level: LogLevel.INFO,
      type: LogType.TRANSACTION,
      message: `Transaction ${transactionId} - Changement d'état: ${oldState} -> ${newState}`,
      user: userId,
      metadata: {
        transactionId,
        applicationId,
        oldState,
        newState,
        changeType: 'STATE_CHANGE'
      },
      createdAt: new Date()
    });

    return log.save();
  }
}







