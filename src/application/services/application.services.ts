import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { DataBaseService } from "src/shared/database/database.service";
import { Application, ApplicationDocument } from "../models/application.schema";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import * as mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { WalletService } from "src/wallet/services/wallet.service";
import { ApplicationKeyService } from './application-key.service';

@Injectable()
export class ApplicationService extends DataBaseService<ApplicationDocument> {
    constructor(
        @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
        @InjectConnection() connection: Connection,
        @Inject(forwardRef(() => WalletService)) private walletService: WalletService,
        private applicationKeyService: ApplicationKeyService
    ){
        super(applicationModel, connection, ['paymentMethods'])
    }

    private generateSecureKey(): string {
        return crypto.randomBytes(32).toString('hex');
    }

    async create(createApplicationDto: any, session = null): Promise<ApplicationDocument> {
        return this.executeWithTransaction(async (session) => {
            try {
                const newApplication = new this.applicationModel({
                    ...createApplicationDto,
                    clientIdProd: uuidv4(),
                    privateKeyProd: this.generateSecureKey(),
                    clientIdTest: uuidv4(),
                    privateKeyTest: this.generateSecureKey()
                });
                
                await newApplication.save({session});
                
                // Sauvegarder les clés en base
                await this.applicationKeyService.createKey({
                    applicationId: newApplication._id.toString(),
                    environment: 'test',
                    permissions: { payments: true, wallet: true, messages: true }
                });
                
                await this.applicationKeyService.createKey({
                    applicationId: newApplication._id.toString(),
                    environment: 'prod',
                    permissions: { payments: true, wallet: true, messages: true }
                });
                
                const wallet = await this.walletService.create({application: newApplication._id}, session);
                
                return newApplication;
            } catch (error) {
                console.error('Erreur lors de la création de l\'application:', error);
                throw error;
            }
        });
    }

    // Alias pour createApplication
    async createApplication(createApplicationDto: any, req: any): Promise<ApplicationDocument> {
        // Ajouter l'ID utilisateur depuis la requête
        const applicationData = {
            ...createApplicationDto,
            user: req['user']['sub'] // Récupérer l'ID utilisateur depuis le token JWT
        };
        
        return this.create(applicationData);
    }

    async generateApiKeys(appId: string, environment: 'test' | 'prod' = 'test'): Promise<ApplicationDocument> {
        return this.executeWithTransaction(async (session) => {
            try {
                // Générer nouvelles clés via ApplicationKeyService
                const { applicationKey, privateKey } = await this.applicationKeyService.createKey({
                    applicationId: appId,
                    environment,
                    permissions: { payments: true, wallet: true, messages: true }
                });
                
                // Mettre à jour l'application avec les nouvelles clés
                const updateData: any = {};
                if (environment === 'prod') {
                    updateData.clientIdProd = applicationKey.clientId;
                    updateData.privateKeyProd = privateKey;
                } else {
                    updateData.clientIdTest = applicationKey.clientId;
                    updateData.privateKeyTest = privateKey;
                }
                
                const updatedApp = await this.update({ _id: appId }, updateData, session);
                return updatedApp;
            } catch (error) {
                console.error(`Erreur génération clés ${environment}:`, error);
                throw error;
            }
        });
    }

    // Alias pour regenerateKeys
    async regenerateKeys(appId: string, environment: 'test' | 'prod' = 'test', req: any): Promise<ApplicationDocument> {
        return this.generateApiKeys(appId, environment);
    }

    async getApplicationById(id: string, req: any): Promise<ApplicationDocument> {
        console.log('Service: Récupération de l\'application avec ID:', id);
        
        if (!req['user'] || !req['user']['sub']) {
            throw new Error('Utilisateur non authentifié ou ID utilisateur manquant');
        }
        
        try {
            const application = await this.findOneByField({ 
                _id: id, 
                user: req['user']['sub'] 
            });
            
            if (!application) {
                throw new NotFoundException(`Application avec l'ID ${id} non trouvée ou vous n'avez pas les permissions`);
            }
            
            return application;
        } catch (error) {
            console.error('Erreur lors de la récupération de l\'application:', error);
            throw error;
        }
    }

    async updateApplicationById(id: string, updateData: any): Promise<ApplicationDocument> {
        console.log('Service: Mise à jour de l\'application avec ID:', id);
        
        try {
            const application = await this.findOneByField({ _id: id });
            
            if (!application) {
                throw new NotFoundException(`Application avec l'ID ${id} non trouvée`);
            }
            
            const updatedApplication = await this.update({ _id: id }, updateData);
            console.log('Application mise à jour avec succès');
            
            return updatedApplication;
        } catch (error) {
            console.error('Erreur lors de la mise à jour de l\'application:', error);
            throw error;
        }
    }

    async getWalletForApplication(applicationId: string) {
        return await this.walletService.findOneByField({application: applicationId});
    }

    async getAllApplications(req): Promise<any[]> {
        console.log('Service: Récupération des applications pour l\'utilisateur:', req['user']?.sub);
        
        if (!req['user'] || !req['user']['sub']) {
            console.error('Utilisateur non trouvé dans la requête:', req['user']);
            throw new Error('Utilisateur non authentifié ou ID utilisateur manquant');
        }
        
        try {
            const applications = await this.findByField({ user: req['user']['sub'] });
            console.log(`${applications.length} applications trouvées pour l'utilisateur ${req['user']['sub']}`);
            
            const applicationIds = applications.map(app => app._id.toString());
            const walletAmounts = await this.walletService.getAmounts(applicationIds);
            
            const applicationsWithWallets = applications.map(app => ({
                ...app.toObject(),
                walletAmount: walletAmounts.get(app._id.toString()) || 0
            }));
            
            return applicationsWithWallets;
        } catch (error) {
            console.error('Erreur lors de la récupération des applications:', error);
            throw error;
        }
    }

    async deleteApplication(id): Promise<any>{
        console.log('Service: Suppression de l\'application avec ID:', id);
        
        try {
            const application = await this.findOneByField({ _id: id });
            if (!application) {
                throw new NotFoundException(`Application avec l'ID ${id} non trouvée`);
            }
            
            // Convertir l'ID en ObjectId pour la recherche du portefeuille
            const applicationObjectId = new mongoose.Types.ObjectId(id);
            
            // Vérifier le solde du portefeuille avant suppression
            const wallet = await this.walletService.findOneByField({ application: applicationObjectId });
            console.log('Portefeuille trouvé:', wallet);
            console.log('Montant du portefeuille:', wallet?.amount);
            
            if (wallet && wallet.amount > 0) {
                throw new BadRequestException(`Impossible de supprimer l'application. Le portefeuille contient encore ${wallet.amount} en fonds. Veuillez d'abord transférer tous les fonds.`);
            }
            
            // Supprimer le portefeuille associé (s'il existe et n'a pas de fonds)
            if (wallet) {
                await this.walletService.delete({ application: applicationObjectId });
            }
            
            // Supprimer l'application
            const result = await this.delete({ _id: id });
            console.log('Application supprimée avec succès');
            
            return result;
        } catch (error) {
            console.error('Erreur lors de la suppression de l\'application:', error);
            throw error;
        }
    }

    async getApplicationKeys(appId: string): Promise<any> {
        const keys = await this.applicationKeyService.getApplicationKeys(appId);
        return keys.map(key => ({
            id: key._id,
            clientId: key.clientId,
            environment: key.environment,
            isActive: key.isActive,
            permissions: key.permissions,
            createdAt: (key as any).createdAt,
            expiresAt: key.expiresAt
        }));
    }
}
