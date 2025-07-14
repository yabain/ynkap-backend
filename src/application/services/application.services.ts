    import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
    import { DataBaseService } from "src/shared/database/database.service";
    import { Application, ApplicationDocument } from "../models/application.schema";
    import { InjectConnection, InjectModel } from "@nestjs/mongoose";
    import { Connection, Model } from "mongoose";
    import { v4 as uuidv4, v6 as uuidv6 } from 'uuid';
    import * as crypto from 'crypto';
    import { WalletService } from "src/wallet/services";

    @Injectable()
    export class ApplicationService extends DataBaseService<ApplicationDocument> {
        constructor(
            @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
            @InjectConnection() connection: Connection,
            private walletService: WalletService
        ){
            super(applicationModel, connection, ['paymentMethods'])
        }

        async createApplication(createApplicationDto, req): Promise<ApplicationDocument> {
            console.log('Début de création d\'application:', createApplicationDto);
            console.log('Utilisateur de la requête:', req.user);
            
            return this.executeWithTransaction(async (session) => {
                try {
                    // Génération de clés sécurisées
                    const clientIdProd = uuidv6();
                    const clientIdTest = uuidv4();
                    const privateKeyProd = this.generateSecureKey();
                    const privateKeyTest = this.generateSecureKey();
                    
                    console.log('Clés générées:', { clientIdProd, clientIdTest });
                    
                    // Vérifier que l'utilisateur est présent
                    if (!req.user || !req.user.sub) {
                        console.error('Utilisateur non trouvé dans la requête:', req.user);
                        throw new Error('Utilisateur non authentifié ou ID utilisateur manquant');
                    }
                    
                    const newApplication = this.createInstance({
                        ...createApplicationDto, 
                        user: req.user.sub, 
                        clientIdProd, 
                        clientIdTest,
                        privateKeyProd,
                        privateKeyTest // Correction de la casse (privateKeytest -> privateKeyTest)
                    });
                    
                    console.log('Nouvelle application créée:', newApplication);
                    
                    await newApplication.save({session});
                    console.log('Application sauvegardée avec ID:', newApplication._id);
                    
                    const wallet = await this.walletService.create({application: newApplication._id}, session);
                    console.log('Portefeuille créé:', wallet);
                    
                    return newApplication;
                } catch (error) {
                    console.error('Erreur lors de la création de l\'application:', error);
                    throw error;
                }
            }).catch((error) => {
                console.error('Erreur capturée dans executeWithTransaction:', error);
                if (error.code == 11000)
                    throw new ConflictException(`Une application avec le champ ${Object.keys(error.keyPattern)[0]} existe déjà`);
                throw error;
            });
        }

        // Méthode pour générer une clé secrète sécurisée
        private generateSecureKey(): string {
            // Génère une clé de 32 caractères hexadécimaux (128 bits)
            return crypto.randomBytes(32).toString('hex');
        }

        // Ajout d'une méthode pour régénérer les clés
        async regenerateKeys(appId: string, environment: 'prod' | 'test', req): Promise<ApplicationDocument> {
            return this.executeWithTransaction(async (session) => {
                const app = await this.findById(appId, session);
                
                if (!app) {
                    throw new NotFoundException(`Application with ID ${appId} not found`);
                }
                
                // Vérifier que l'utilisateur est le propriétaire de l'application
                if (app.user !== req['user']['sub']) {
                    throw new ForbiddenException('You do not have permission to regenerate keys for this application');
                }
                
                const updateData: any = {};
                
                if (environment === 'prod') {
                    updateData.clientIdProd = uuidv6();
                    updateData.privateKeyProd = this.generateSecureKey();
                } else {
                    updateData.clientIdTest = uuidv4();
                    updateData.privateKeyTest = this.generateSecureKey(); 
                }
                
                const updatedApp = await this.update({ _id: appId }, updateData, session);
                return updatedApp;
            });
        }

        async getAllApplications(req): Promise<any[]> {
            console.log('Service: Récupération des applications pour l\'utilisateur:', req['user']?.sub);
            
            if (!req['user'] || !req['user']['sub']) {
                console.error('Utilisateur non trouvé dans la requête:', req['user']);
                throw new Error('Utilisateur non authentifié ou ID utilisateur manquant');
            }
            
            try {
                // Utiliser directement le modèle Mongoose pour éviter les problèmes avec findAll
                const applications = await this.applicationModel.find({ 
                    user: req['user']['sub'], 
                    isDeleted: false 
                }).exec();
                
                if (!applications || applications.length === 0) {
                    return [];
                }
                
                console.log('IDs des applications trouvées:', applications.map(app => app._id));
                
                const walletAmounts: Map<string, number> = await this.walletService.getAmounts(applications.map((app) => app._id));
                console.log('Montants des portefeuilles récupérés:', walletAmounts);

                return applications.map((application) => {
                    const appObj = application.toObject();
                    const walletAmount = walletAmounts.get(application._id.toString()) || 0;
                    console.log(`Application ${application._id}: montant du portefeuille =`, walletAmount);
                    
                    return {
                        ...appObj,
                        walletAmount: walletAmount
                    };
                });
            } catch (error) {
                console.error('Erreur dans getAllApplications:', error);
                throw error;
            }
        }

        async getApplicationById(id,req): Promise<any>{
            const [application, walletAmount] = await Promise.all([
                this.findOneByField({_id: id, user: req['user']['sub']}),
                this.walletService.getAmount(id)
            ]);

            if(!application)
                throw new NotFoundException(`The application with the ID ${id} cannot be found`);

            return {
                ...application.toObject(),
                walletAmount: walletAmount.amount
            }
        }

        async updateApplicationById(id, updateApplicationDtos): Promise<ApplicationDocument>{
        const updatedApplication = await this.update({_id: id}, updateApplicationDtos);
        
        if(!updatedApplication)
            throw new NotFoundException(`The application with the ID ${id} cannot be found`);
        
        return updatedApplication;
        }

        async deleteApplication(id): Promise<any>{
            return this.executeWithTransaction(async (session) => {
                // Vérifier si l'application existe
                const application = await this.findOneByField({_id: id});
                if(!application) throw new NotFoundException(`The application with the ID ${id} cannot be found`);
                
                // Récupérer le portefeuille associé
                let wallet = await this.walletService.findOneByField({application: id});
                
                // Si un portefeuille existe, vérifier s'il est vide
                if(wallet) {
                    const walletId = wallet._id; // Récupération de l'ID du portefeuille
                    console.log(`ID du portefeuille: ${walletId}`);
                    
                    if(wallet.amount > 0) {
                        throw new BadRequestException(`Veuillez transférer les fonds du portefeuille de ${application.name} avant de poursuivre`);
                    }
                    
                    // Utilisation de l'ID pour supprimer le portefeuille
                    await this.walletService.delete({"_id": walletId}, session);
                }
                
                // Continuer avec la suppression de l'application
                await this.delete({_id: id}, session);
                console.log(`Application ${id} supprimée avec succès`);
                
                return { message: `Application ${application.name} et son portefeuille ont été supprimés avec succès` };
            });
        }
    }
