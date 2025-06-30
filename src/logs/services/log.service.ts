import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument } from '../schemas/log.schema';
import { CreateLogDto } from '../dto/create-log.dto';

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
}






