import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Log, LogDocument } from '../schemas/log.schema';
import { LogLevel } from '../enums/log-level.enum';
import { LogType } from '../enums/log-type.enum';

@Injectable()
export class UserActionLogService {
  constructor(
    @InjectModel(Log.name) private readonly logModel: Model<LogDocument>
  ) {}

  /**
   * Log une action utilisateur avec format standardisé
   */
  async logUserAction(
    userId: string,
    userName: string,
    action: string,
    target: string,
    result: string,
    metadata?: Record<string, any>
  ): Promise<LogDocument> {
    const userInfo = userName ? `${userName} (${userId})` : userId;
    
    // Message détaillé selon l'action
    let detailedMessage = this.generateActionMessage(userInfo, action, target, result, metadata);

    const log = new this.logModel({
      level: result === 'FAILED' ? LogLevel.ERROR : LogLevel.INFO,
      type: LogType.ACTION,
      message: detailedMessage,
      user: userId,
      metadata: {
        userName,
        userId,
        userInfo,
        action,
        target,
        result,
        timestamp: new Date().toISOString(),
        ...metadata
      },
      createdAt: new Date()
    });

    return log.save();
  }

  private generateActionMessage(userInfo: string, action: string, target: string, result: string, metadata?: Record<string, any>): string {
    const timestamp = new Date().toLocaleString('fr-FR');
    
    switch (action) {
      case 'WITHDRAWAL':
        const amount = metadata?.amount || 0;
        const newBalance = metadata?.newBalance || 'N/A';
        return `[${timestamp}] ${userInfo} a effectué un RETRAIT de ${amount} XAF depuis ${target} | Nouveau solde: ${newBalance} XAF | Résultat: ${result}`;
        
      case 'DEPOSIT':
        const depositAmount = metadata?.amount || 0;
        const balanceAfter = metadata?.newBalance || 'N/A';
        return `[${timestamp}] ${userInfo} a effectué un DÉPÔT de ${depositAmount} XAF vers ${target} | Nouveau solde: ${balanceAfter} XAF | Résultat: ${result}`;
        
      case 'CREATE_APPLICATION':
        const appName = metadata?.applicationName || target;
        return `[${timestamp}] ${userInfo} a créé l'APPLICATION "${appName}" | ID: ${target} | Résultat: ${result}`;
        
      case 'UPDATE_APPLICATION':
        return `[${timestamp}] ${userInfo} a modifié l'APPLICATION ${target} | Résultat: ${result}`;
        
      case 'DELETE_APPLICATION':
        return `[${timestamp}] ${userInfo} a supprimé l'APPLICATION ${target} | Résultat: ${result}`;
        
      case 'LOGIN':
        const ip = metadata?.ip || 'IP inconnue';
        return `[${timestamp}] ${userInfo} s'est connecté au système | IP: ${ip} | Résultat: ${result}`;
        
      case 'LOGOUT':
        return `[${timestamp}] ${userInfo} s'est déconnecté du système | Résultat: ${result}`;
        
      default:
        return `[${timestamp}] ${userInfo} a effectué l'action ${action} sur ${target} | Résultat: ${result}`;
    }
  }
}

