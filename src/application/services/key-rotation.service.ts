import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Application, ApplicationDocument } from '../models/application.schema';
import { KeyAuditService } from './key-audit.service';
import { AuditEventType } from '../models/key-audit.schema';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

@Injectable()
export class KeyRotationService {
  constructor(
    @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
    private readonly keyAuditService: KeyAuditService
  ) {}

  private generateSecureKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async rotateKeys(
    appId: string, 
    environment: 'test' | 'prod',
    gracePeriodHours: number = 24,
    req: any
  ): Promise<{
    application: ApplicationDocument;
    newKeys: {
      clientId: string;
      privateKey: string;
    };
    previousKeys: {
      clientId: string;
      privateKey: string;
    };
    gracePeriodEnds: Date;
  }> {
    const app = await this.applicationModel.findById(appId);
    
    if (!app) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }

    // Vérifier que l'environnement est activé
    if (environment === 'prod' && !app.envProd) {
      throw new BadRequestException('Production environment is not enabled for this application');
    }
    
    if (environment === 'test' && !app.envTest) {
      throw new BadRequestException('Test environment is not enabled for this application');
    }

    // Générer les nouvelles clés
    const newClientId = uuidv4();
    const newPrivateKey = this.generateSecureKey();

    // Sauvegarder les anciennes clés
    const updateData: any = {
      keyRotationDate: new Date(),
      keyRotationGracePeriodHours: gracePeriodHours,
      previousKeysActive: true
    };

    let previousKeys: { clientId: string; privateKey: string };

    if (environment === 'prod') {
      previousKeys = {
        clientId: app.clientIdProd,
        privateKey: app.privateKeyProd
      };
      
      updateData.previousClientIdProd = app.clientIdProd;
      updateData.previousPrivateKeyProd = app.privateKeyProd;
      updateData.clientIdProd = newClientId;
      updateData.privateKeyProd = newPrivateKey;
    } else {
      previousKeys = {
        clientId: app.clientIdTest,
        privateKey: app.privateKeyTest
      };
      
      updateData.previousClientIdTest = app.clientIdTest;
      updateData.previousPrivateKeyTest = app.privateKeyTest;
      updateData.clientIdTest = newClientId;
      updateData.privateKeyTest = newPrivateKey;
    }

    // Mettre à jour l'application
    const updatedApp = await this.applicationModel.findByIdAndUpdate(
      appId,
      updateData,
      { new: true }
    );

    // Logger l'événement de rotation
    await this.keyAuditService.logKeyRotation({
      applicationId: appId,
      clientId: newClientId,
      environment,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('user-agent') || 'unknown',
      userId: req.user?.sub || 'unknown',
      previousClientId: previousKeys.clientId,
      gracePeriodHours
    });

    // Programmer la désactivation des anciennes clés
    this.scheduleKeyDeactivation(appId, environment, gracePeriodHours);

    const gracePeriodEnds = new Date();
    gracePeriodEnds.setHours(gracePeriodEnds.getHours() + gracePeriodHours);

    return {
      application: updatedApp,
      newKeys: {
        clientId: newClientId,
        privateKey: newPrivateKey
      },
      previousKeys,
      gracePeriodEnds
    };
  }

  async deactivatePreviousKeys(appId: string, environment: 'test' | 'prod'): Promise<ApplicationDocument> {
    const updateData: any = {
      previousKeysActive: false
    };

    if (environment === 'prod') {
      updateData.previousClientIdProd = null;
      updateData.previousPrivateKeyProd = null;
    } else {
      updateData.previousClientIdTest = null;
      updateData.previousPrivateKeyTest = null;
    }

    const updatedApp = await this.applicationModel.findByIdAndUpdate(
      appId,
      updateData,
      { new: true }
    );

    if (!updatedApp) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }

    return updatedApp;
  }

  async checkKeyValidity(clientId: string, privateKey: string): Promise<{
    isValid: boolean;
    application?: ApplicationDocument;
    environment?: 'test' | 'prod';
    isCurrentKey: boolean;
    isPreviousKey: boolean;
    gracePeriodActive?: boolean;
  }> {
    // Chercher avec les clés actuelles
    let app = await this.applicationModel.findOne({
      $or: [
        { clientIdProd: clientId, privateKeyProd: privateKey, envProd: true },
        { clientIdTest: clientId, privateKeyTest: privateKey, envTest: true }
      ],
      isDeleted: false
    });

    if (app) {
      const environment = app.clientIdProd === clientId ? 'prod' : 'test';
      return {
        isValid: true,
        application: app,
        environment,
        isCurrentKey: true,
        isPreviousKey: false
      };
    }

    // Chercher avec les anciennes clés (si encore actives)
    app = await this.applicationModel.findOne({
      $or: [
        { 
          previousClientIdProd: clientId, 
          previousPrivateKeyProd: privateKey, 
          envProd: true,
          previousKeysActive: true
        },
        { 
          previousClientIdTest: clientId, 
          previousPrivateKeyTest: privateKey, 
          envTest: true,
          previousKeysActive: true
        }
      ],
      isDeleted: false
    });

    if (app) {
      const environment = app.previousClientIdProd === clientId ? 'prod' : 'test';
      
      // Vérifier si la période de grâce est encore active
      const gracePeriodEnd = new Date(app.keyRotationDate);
      gracePeriodEnd.setHours(gracePeriodEnd.getHours() + app.keyRotationGracePeriodHours);
      const gracePeriodActive = new Date() < gracePeriodEnd;

      if (!gracePeriodActive) {
        // Désactiver automatiquement les anciennes clés
        await this.deactivatePreviousKeys(app._id.toString(), environment);
        return {
          isValid: false,
          application: app,
          environment,
          isCurrentKey: false,
          isPreviousKey: true,
          gracePeriodActive: false
        };
      }

      return {
        isValid: true,
        application: app,
        environment,
        isCurrentKey: false,
        isPreviousKey: true,
        gracePeriodActive: true
      };
    }

    return {
      isValid: false,
      isCurrentKey: false,
      isPreviousKey: false
    };
  }

  private scheduleKeyDeactivation(appId: string, environment: 'test' | 'prod', gracePeriodHours: number) {
    // Programmer la désactivation automatique après la période de grâce
    setTimeout(async () => {
      try {
        await this.deactivatePreviousKeys(appId, environment);
        console.log(`Previous ${environment} keys deactivated for application ${appId}`);
      } catch (error) {
        console.error(`Failed to deactivate previous keys for application ${appId}:`, error);
      }
    }, gracePeriodHours * 60 * 60 * 1000); // Convertir heures en millisecondes
  }

  async getKeyRotationStatus(appId: string): Promise<{
    hasActiveRotation: boolean;
    rotationDate?: Date;
    gracePeriodEnds?: Date;
    gracePeriodActive?: boolean;
    environments: {
      test?: {
        currentKeys: { clientId: string };
        previousKeys?: { clientId: string };
      };
      prod?: {
        currentKeys: { clientId: string };
        previousKeys?: { clientId: string };
      };
    };
  }> {
    const app = await this.applicationModel.findById(appId);
    
    if (!app) {
      throw new NotFoundException(`Application with ID ${appId} not found`);
    }

    const result: any = {
      hasActiveRotation: app.previousKeysActive || false,
      environments: {}
    };

    if (app.keyRotationDate && app.previousKeysActive) {
      result.rotationDate = app.keyRotationDate;
      
      const gracePeriodEnd = new Date(app.keyRotationDate);
      gracePeriodEnd.setHours(gracePeriodEnd.getHours() + app.keyRotationGracePeriodHours);
      result.gracePeriodEnds = gracePeriodEnd;
      result.gracePeriodActive = new Date() < gracePeriodEnd;
    }

    // Informations sur les environnements
    if (app.envTest) {
      result.environments.test = {
        currentKeys: { clientId: app.clientIdTest }
      };
      if (app.previousClientIdTest && app.previousKeysActive) {
        result.environments.test.previousKeys = { clientId: app.previousClientIdTest };
      }
    }

    if (app.envProd) {
      result.environments.prod = {
        currentKeys: { clientId: app.clientIdProd }
      };
      if (app.previousClientIdProd && app.previousKeysActive) {
        result.environments.prod.previousKeys = { clientId: app.previousClientIdProd };
      }
    }

    return result;
  }
}