import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseInterceptors } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody, ApiBearerAuth, ApiSecurity } from '@nestjs/swagger';
import { PaymentMethodService } from "../services/payment-method.service";
import { UpdatePaymentMethodTableDTO } from "../dtos/update-payment-method-table.dto";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { CreatePaymentMethodDTO } from "../dtos/create-payment-method.dto";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { UpdatePaymentMethodDTO } from "../dtos/update-payment-method.dto";
import { Request } from "express";

@ApiTags('Payment Methods Management')
@Controller('payment-method')
@UseInterceptors(TransformResponeInterceptor)
export class PaymentMethodController {

    constructor(
        private paymentMethodService: PaymentMethodService,
    ){}

    @Post()
    @CustomMessage('Payment method successfully created')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Créer un nouveau moyen de paiement',
        description: `
        Cette route permet aux administrateurs de créer un nouveau moyen de paiement dans le système Y-Nkap.
        
        **Fonctionnalités principales :**
        - Création d'un nouveau moyen de paiement avec validation complète
        - Conversion automatique du nom en majuscules pour la cohérence
        - Vérification d'unicité du nom pour éviter les doublons
        - Attribution automatique du statut inactif par défaut (sécurité)
        
        **Permissions requises :**
        - Authentification JWT valide obligatoire
        - Rôle 'admin' dans Keycloak requis
        - Seuls les administrateurs peuvent créer des moyens de paiement
        
        **Règles de validation strictes :**
        - Le nom doit contenir au minimum 3 caractères
        - Le logo doit être une URL valide et accessible
        - Le type doit correspondre exactement à l'énumération PaymentMethodsTypes
        - Tous les champs sont obligatoires
        
        **Processus de création :**
        1. Validation des données d'entrée
        2. Vérification des permissions administrateur
        3. Transformation du nom en majuscules
        4. Vérification d'unicité dans la base de données
        5. Création avec transaction pour garantir la cohérence
        6. Retour des données du moyen de paiement créé
        `
    })
    @ApiBody({
        description: 'Données complètes du nouveau moyen de paiement à créer dans le système',
        schema: {
            type: 'object',
            required: ['name', 'logo', 'type'],
            properties: {
                name: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 50,
                    description: 'Nom unique du moyen de paiement (sera automatiquement converti en majuscules)',
                    example: 'MTN Money',
                    pattern: '^[a-zA-Z0-9\\s\\-_]+$'
                },
                logo: {
                    type: 'string',
                    format: 'uri',
                    description: 'URL complète et valide du logo du moyen de paiement (HTTPS recommandé)',
                    example: 'https://cdn.y-nkap.com/logos/mtn-money.png',
                    maxLength: 500
                },
                type: {
                    type: 'string',
                    enum: ['MOBILE_MONEY', 'BANK_CARD', 'BANK_TRANSFER', 'CRYPTO', 'WALLET', 'CASH'],
                    description: 'Type de moyen de paiement selon la classification Y-Nkap',
                    example: 'MOBILE_MONEY'
                }
            },
            additionalProperties: false
        },
        examples: {
            mtnMoney: {
                summary: 'MTN Money',
                description: 'Exemple de création du moyen de paiement MTN Money',
                value: {
                    name: 'MTN Money',
                    logo: 'https://cdn.y-nkap.com/logos/mtn-money.png',
                    type: 'MOBILE_MONEY'
                }
            },
            orangeMoney: {
                summary: 'Orange Money',
                description: 'Exemple de création du moyen de paiement Orange Money',
                value: {
                    name: 'Orange Money',
                    logo: 'https://cdn.y-nkap.com/logos/orange-money.png',
                    type: 'MOBILE_MONEY'
                }
            },
            visaCard: {
                summary: 'Carte Visa',
                description: 'Exemple de création d\'un moyen de paiement par carte',
                value: {
                    name: 'Visa Card',
                    logo: 'https://cdn.y-nkap.com/logos/visa.png',
                    type: 'BANK_CARD'
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Moyen de paiement créé avec succès dans le système',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Payment method successfully created' },
                data: {
                    type: 'object',
                    properties: {
                        _id: { 
                            type: 'string', 
                            example: '64f8a1b2c3d4e5f6a7b8c9d0',
                            description: 'ID unique MongoDB du moyen de paiement créé'
                        },
                        name: { 
                            type: 'string', 
                            example: 'MTN_MONEY',
                            description: 'Nom du moyen de paiement en majuscules'
                        },
                        logo: { 
                            type: 'string', 
                            example: 'https://cdn.y-nkap.com/logos/mtn-money.png',
                            description: 'URL du logo du moyen de paiement'
                        },
                        type: { 
                            type: 'string', 
                            example: 'MOBILE_MONEY',
                            description: 'Type de moyen de paiement'
                        },
                        active: { 
                            type: 'boolean', 
                            example: false,
                            description: 'Statut d\'activation (false par défaut pour sécurité)'
                        },
                        isDeleted: { 
                            type: 'boolean', 
                            example: false,
                            description: 'Indicateur de suppression logique'
                        },
                        createdAt: { 
                            type: 'string', 
                            format: 'date-time', 
                            example: '2024-01-15T10:30:00.000Z',
                            description: 'Date et heure de création'
                        }
                    }
                },
                timestamp: { 
                    type: 'string', 
                    format: 'date-time', 
                    example: '2024-01-15T10:30:00.439Z' 
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Données de requête invalides ou malformées',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                        'name must be longer than or equal to 3 characters',
                        'logo must be a valid URL',
                        'type must be one of the following values: MOBILE_MONEY, BANK_CARD, BANK_TRANSFER, CRYPTO, WALLET'
                    ]
                },
                error: { type: 'string', example: 'Bad Request' },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Token d\'authentification manquant, invalide ou expiré',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                message: { type: 'string', example: 'Unauthorized' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 403,
        description: 'Permissions insuffisantes - Rôle administrateur requis',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'This feature is only available to administrators' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 409,
        description: 'Conflit - Un moyen de paiement avec ce nom existe déjà',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 409 },
                message: { type: 'string', example: 'le moyen de paiement avec le champ name existe déjà et doit être unique' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 500,
        description: 'Erreur interne du serveur lors de la création',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 500 },
                message: { type: 'string', example: 'An internal error has occurred' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
            }
        }
    })
    async createPaymentMethod(@Body() createPaymentMethodDto: CreatePaymentMethodDTO, @Req() req: Request){
        return await this.paymentMethodService.createPaymentMethod(createPaymentMethodDto, req);
    }

    @CustomMessage('Payment methods successfully retrieved')
    @Get()
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Récupérer tous les moyens de paiement disponibles',
        description: `
        Cette route permet de récupérer la liste complète de tous les moyens de paiement 
        disponibles dans le système Y-Nkap, incluant leurs informations détaillées.
        
        **Fonctionnalités principales :**
        - Récupération de tous les moyens de paiement (actifs et inactifs)
        - Exclusion automatique des moyens de paiement supprimés (soft delete)
        - Retour des informations complètes pour chaque moyen de paiement
        - Tri par date de création (plus récents en premier)
        
        **Permissions requises :**
        - Authentification JWT valide obligatoire
        - Aucun rôle spécifique requis (accessible à tous les utilisateurs authentifiés)
        - Idéal pour les interfaces utilisateur et les configurations
        
        **Cas d'usage typiques :**
        - Interface d'administration pour la gestion des moyens de paiement
        - Configuration des applications clientes
        - Sélection des moyens de paiement lors de la création d'applications
        - Affichage des options de paiement disponibles
        - Intégration dans des dashboards de monitoring
        
        **Données retournées :**
        - ID unique de chaque moyen de paiement
        - Nom standardisé en majuscules
        - URL du logo pour l'affichage
        - Type de moyen de paiement
        - Statut d'activation actuel
        - Date de création pour l'historique
        `
    })
    @ApiResponse({
        status: 200,
        description: 'Liste des moyens de paiement récupérée avec succès',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Payment methods successfully retrieved' },
                data: {
                    type: 'array',
                    items: {
                        type: 'object',
                        properties: {
                            _id: { 
                                type: 'string', 
                                example: '64f8a1b2c3d4e5f6a7b8c9d0',
                                description: 'ID unique MongoDB du moyen de paiement'
                            },
                            name: { 
                                type: 'string', 
                                example: 'MTN_MONEY',
                                description: 'Nom du moyen de paiement en majuscules'
                            },
                            logo: { 
                                type: 'string', 
                                example: 'https://cdn.y-nkap.com/logos/mtn-money.png',
                                description: 'URL du logo pour l\'affichage'
                            },
                            type: { 
                                type: 'string', 
                                example: 'MOBILE_MONEY',
                                description: 'Type de moyen de paiement'
                            },
                            active: { 
                                type: 'boolean', 
                                example: true,
                                description: 'Statut d\'activation (true = disponible pour transactions)'
                            },
                            isDeleted: { 
                                type: 'boolean', 
                                example: false,
                                description: 'Indicateur de suppression logique'
                            },
                            createdAt: { 
                                type: 'string', 
                                format: 'date-time', 
                                example: '2024-01-15T10:30:00.000Z',
                                description: 'Date et heure de création'
                            }
                        }
                    },
                    example: [
                        {
                            _id: '64f8a1b2c3d4e5f6a7b8c9d0',
                            name: 'MTN_MONEY',
                            logo: 'https://cdn.y-nkap.com/logos/mtn-money.png',
                            type: 'MOBILE_MONEY',
                            active: true,
                            isDeleted: false,
                            createdAt: '2024-01-15T10:30:00.000Z'
                        },
                        {
                            _id: '64f8a1b2c3d4e5f6a7b8c9d1',
                            name: 'ORANGE_MONEY',
                            logo: 'https://cdn.y-nkap.com/logos/orange-money.png',
                            type: 'MOBILE_MONEY',
                            active: true,
                            isDeleted: false,
                            createdAt: '2024-01-15T11:00:00.000Z'
                        },
                        {
                            _id: '64f8a1b2c3d4e5f6a7b8c9d2',
                            name: 'VISA_CARD',
                            logo: 'https://cdn.y-nkap.com/logos/visa.png',
                            type: 'BANK_CARD',
                            active: false,
                            isDeleted: false,
                            createdAt: '2024-01-15T12:00:00.000Z'
                        }
                    ]
                },
                timestamp: { 
                    type: 'string', 
                    format: 'date-time', 
                    example: '2024-01-15T10:30:00.439Z' 
                }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Token d\'authentification manquant, invalide ou expiré',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 401 },
                message: { type: 'string', example: 'Unauthorized' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 500,
        description: 'Erreur interne du serveur lors de la récupération',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 500 },
                message: { type: 'string', example: 'An internal error has occurred while retrieving payment methods' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
            }
        }
    })
    async getPaymentMethods() {
        return await this.paymentMethodService.getPaymentMethods();
    }

    @CustomMessage('Payment method(s) successfully added to the specified application')
    @Put('app-add/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Ajouter des moyens de paiement à une application spécifique',
        description: `
        Cette route permet d'associer un ou plusieurs moyens de paiement à une application cliente.
        Les moyens de paiement ajoutés deviennent immédiatement disponibles pour les transactions de cette application.
        
        **Fonctionnalités principales :**
        - Association multiple de moyens de paiement en une seule requête
        - Vérification de l'existence et de la validité de l'application cible
        - Validation de l'existence de tous les moyens de paiement spécifiés
        - Évitement automatique des doublons (idempotence)
        - Mise à jour atomique avec gestion des transactions
        
        **Permissions requises :**
        - Authentification JWT valide obligatoire
        - Propriétaire de l'application OU rôle administrateur
        - Vérification de l'appartenance de l'application à l'utilisateur
        
        **Règles métier importantes :**
        - L'application doit exister et être active (non supprimée)
        - Tous les moyens de paiement spécifiés doivent exister dans le système
        - Les moyens de paiement peuvent être actifs ou inactifs (flexibilité)
        - Les doublons sont automatiquement ignorés sans erreur
        - L'opération est atomique (tout ou rien)
        
        **Impact sur le système :**
        - Les nouveaux moyens de paiement sont immédiatement disponibles
        - Les transactions existantes ne sont pas affectées
        - L'historique des associations est préservé
        - Les webhooks de notification peuvent être déclenchés
        `
    })
    @ApiParam({
        name: 'id',
        description: 'ID MongoDB unique de l\'application cible à laquelle ajouter les moyens de paiement',
        type: 'string',
        example: '64f8a1b2c3d4e5f6a7b8c9d2',
        schema: {
            pattern: '^[0-9a-fA-F]{24}$'
        }
    })
    @ApiBody({
        description: 'Liste des IDs des moyens de paiement à associer à l\'application spécifiée',
        schema: {
            type: 'object',
            required: ['paymentMethods'],
            properties: {
                paymentMethods: {
                    type: 'array',
                    items: { 
                        type: 'string',
                        pattern: '^[0-9a-fA-F]{24}$',
                        description: 'ID MongoDB valide d\'un moyen de paiement'
                    },
                    minItems: 1,
                    maxItems: 20,
                    uniqueItems: true,
                    description: 'Tableau des IDs MongoDB des moyens de paiement à ajouter (maximum 20)',
                    example: ['64f8a1b2c3d4e5f6a7b8c9d0', '64f8a1b2c3d4e5f6a7b8c9d1']
                }
            },
            additionalProperties: false
        },
        examples: {
            singlePaymentMethod: {
                summary: 'Ajouter un seul moyen de paiement',
                description: 'Exemple d\'ajout d\'un seul moyen de paiement MTN Money',
                value: {
                    paymentMethods: ['64f8a1b2c3d4e5f6a7b8c9d0']
                }
            },
            multiplePaymentMethods: {
                summary: 'Ajouter plusieurs moyens de paiement',
                description: 'Exemple d\'ajout de MTN Money et Orange Money',
                value: {
                    paymentMethods: [
                        '64f8a1b2c3d4e5f6a7b8c9d0',
                        '64f8a1b2c3d4e5f6a7b8c9d1'
                    ]
                }
            },
            allMobileMoney: {
                summary: 'Ajouter tous les moyens de paiement mobile',
                description: 'Exemple d\'ajout de tous les moyens de paiement mobile disponibles',
                value: {
                    paymentMethods: [
                        '64f8a1b2c3d4e5f6a7b8c9d0',
                        '64f8a1b2c3d4e5f6a7b8c9d1',
                        '64f8a1b2c3d4e5f6a7b8c9d3'
                    ]
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Moyens de paiement ajoutés avec succès à l\'application',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Payment method(s) successfully added to the specified application' },
                data: {
                    type: 'object',
                    properties: {
                        _id: { 
                            type: 'string', 
                            example: '64f8a1b2c3d4e5f6a7b8c9d2',
                            description: 'ID de l\'application mise à jour'
                        },
                        name: { 
                            type: 'string', 
                            example: 'Mon Application E-commerce',
                            description: 'Nom de l\'application'
                        },
                        paymentMethods: {
                            type: 'array',
                            items: { type: 'string' },
                            example: [
                                '64f8a1b2c3d4e5f6a7b8c9d0',
                                '64f8a1b2c3d4e5f6a7b8c9d1',
                                '64f8a1b2c3d4e5f6a7b8c9d3'
                            ],
                            description: 'Liste complète des moyens de paiement associés après ajout'
                        },
                        updatedAt: { 
                            type: 'string', 
                            format: 'date-time', 
                            example: '2024-01-15T11:00:00.000Z',
                            description: 'Date et heure de la dernière mise à jour'
                        }
                    }
                },
                timestamp: { 
                    type: 'string', 
                    format: 'date-time', 
                    example: '2024-01-15T11:00:00.439Z' 
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Données de requête invalides ou malformées',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                        'paymentMethods must contain at least 1 element',
                        'each value in paymentMethods must be a mongodb id',
                        'paymentMethods must contain unique values'
                    ]
                },
                error: { type: 'string', example: 'Bad Request' },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Token d\'authentification manquant, invalide ou expiré'
    })
    @ApiResponse({
        status: 403,
        description: 'Accès refusé - Vous n\'êtes pas propriétaire de cette application',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'You do not have permission to modify this application' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Application ou moyens de paiement non trouvés',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { 
                    type: 'string', 
                    example: 'the application with the id \'64f8a1b2c3d4e5f6a7b8c9d2\' cannot be found'
                },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 500,
        description: 'Erreur interne du serveur lors de l\'ajout',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 500 },
                message: { type: 'string', example: 'An internal error has occurred' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T11:00:00.439Z' }
            }
        }
    })
    async addPaymentMethods(@Body() updatePaymentMethodsTableDto: UpdatePaymentMethodTableDTO, @Param("id", ObjectIDValidationPipe) id: string) {
        return await this.paymentMethodService.addPaymentMethods(updatePaymentMethodsTableDto, id);
    }

    @CustomMessage('Payment method status successfully updated')
    @Put(':id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Mettre à jour un moyen de paiement existant',
        description: `
        Cette route permet aux administrateurs de modifier complètement les informations 
        d'un moyen de paiement existant dans le système Y-Nkap.
        
        **Fonctionnalités principales :**
        - Modification complète de toutes les propriétés du moyen de paiement
        - Activation/désactivation du moyen de paiement pour contrôler sa disponibilité
        - Validation stricte des nouvelles données avant mise à jour
        - Gestion de l'historique des modifications avec audit trail
        - Mise à jour atomique avec gestion des transactions
        
        **Permissions requises :**
        - Authentification JWT valide obligatoire
        - Rôle 'admin' dans Keycloak strictement requis
        - Seuls les super-administrateurs peuvent modifier les moyens de paiement
        
        **Impact système critique :**
        - Les applications utilisant ce moyen de paiement sont affectées immédiatement
        - La désactivation (active: false) empêche toutes les nouvelles transactions
        - Les transactions en cours ne sont jamais interrompues (sécurité)
        - Les modifications de nom/logo sont répercutées dans toutes les interfaces
        - Les webhooks de notification sont déclenchés pour informer les applications
        
        **Règles de validation renforcées :**
        - Le nom doit rester unique dans tout le système
        - L'URL du logo doit être accessible et valide
        - Le type ne peut pas être modifié vers un type incompatible
        - Les modifications sont journalisées pour audit et conformité
        `
    })
    @ApiParam({
        name: 'id',
        description: 'ID MongoDB unique du moyen de paiement à modifier',
        type: 'string',
        example: '64f8a1b2c3d4e5f6a7b8c9d0',
        schema: {
            pattern: '^[0-9a-fA-F]{24}$'
        }
    })
    @ApiBody({
        description: 'Nouvelles données complètes du moyen de paiement (tous les champs sont requis)',
        schema: {
            type: 'object',
            required: ['name', 'logo', 'type', 'active'],
            properties: {
                name: {
                    type: 'string',
                    minLength: 3,
                    maxLength: 50,
                    description: 'Nouveau nom unique du moyen de paiement (sera converti en majuscules)',
                    example: 'MTN Mobile Money',
                    pattern: '^[a-zA-Z0-9\\s\\-_]+$'
                },
                logo: {
                    type: 'string',
                    format: 'uri',
                    description: 'Nouvelle URL complète et accessible du logo (HTTPS fortement recommandé)',
                    example: 'https://cdn.y-nkap.com/logos/mtn-updated.png',
                    maxLength: 500
                },
                type: {
                    type: 'string',
                    enum: ['MOBILE_MONEY', 'BANK_CARD', 'BANK_TRANSFER', 'CRYPTO', 'WALLET', 'CASH'],
                    description: 'Type de moyen de paiement selon la classification Y-Nkap',
                    example: 'MOBILE_MONEY'
                },
                active: {
                    type: 'boolean',
                    description: 'Statut d\'activation (true = disponible pour nouvelles transactions, false = désactivé)',
                    example: true
                }
            },
            additionalProperties: false
        },
        examples: {
            activatePaymentMethod: {
                summary: 'Activer un moyen de paiement',
                description: 'Exemple d\'activation d\'un moyen de paiement avec mise à jour du logo',
                value: {
                    name: 'MTN Mobile Money',
                    logo: 'https://cdn.y-nkap.com/logos/mtn-new-logo.png',
                    type: 'MOBILE_MONEY',
                    active: true
                }
            },
            deactivatePaymentMethod: {
                summary: 'Désactiver un moyen de paiement',
                description: 'Exemple de désactivation temporaire d\'un moyen de paiement',
                value: {
                    name: 'Orange Money',
                    logo: 'https://cdn.y-nkap.com/logos/orange-money.png',
                    type: 'MOBILE_MONEY',
                    active: false
                }
            },
            updateBankCard: {
                summary: 'Mettre à jour une carte bancaire',
                description: 'Exemple de mise à jour d\'un moyen de paiement par carte',
                value: {
                    name: 'Visa Premium Card',
                    logo: 'https://cdn.y-nkap.com/logos/visa-premium.png',
                    type: 'BANK_CARD',
                    active: true
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Moyen de paiement mis à jour avec succès',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Payment method status successfully updated' },
                data: {
                    type: 'object',
                    properties: {
                        _id: { 
                            type: 'string', 
                            example: '64f8a1b2c3d4e5f6a7b8c9d0',
                            description: 'ID unique du moyen de paiement mis à jour'
                        },
                        name: { 
                            type: 'string', 
                            example: 'MTN_MOBILE_MONEY',
                            description: 'Nom mis à jour en majuscules'
                        },
                        logo: { 
                            type: 'string', 
                            example: 'https://cdn.y-nkap.com/logos/mtn-updated.png',
                            description: 'URL du nouveau logo'
                        },
                        type: { 
                            type: 'string', 
                            example: 'MOBILE_MONEY',
                            description: 'Type de moyen de paiement'
                        },
                        active: { 
                            type: 'boolean', 
                            example: true,
                            description: 'Nouveau statut d\'activation'
                        },
                        isDeleted: { 
                            type: 'boolean', 
                            example: false,
                            description: 'Indicateur de suppression logique'
                        },
                        createdAt: { 
                            type: 'string', 
                            format: 'date-time', 
                            example: '2024-01-15T10:30:00.000Z',
                            description: 'Date de création originale'
                        },
                        updatedAt: { 
                            type: 'string', 
                            format: 'date-time', 
                            example: '2024-01-15T12:00:00.000Z',
                            description: 'Date et heure de la dernière mise à jour'
                        }
                    }
                },
                timestamp: { 
                    type: 'string', 
                    format: 'date-time', 
                    example: '2024-01-15T12:00:00.439Z' 
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Données de requête invalides ou malformées',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: {
                    type: 'array',
                    items: { type: 'string' },
                    example: [
                        'name must be longer than or equal to 3 characters',
                        'logo must be a valid URL',
                        'active must be a boolean value'
                    ]
                },
                error: { type: 'string', example: 'Bad Request' },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T12:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Token d\'authentification manquant, invalide ou expiré'
    })
    @ApiResponse({
        status: 403,
        description: 'Permissions insuffisantes - Rôle administrateur strictement requis',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'This feature is only available to administrators' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T12:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Moyen de paiement non trouvé avec l\'ID spécifié',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { type: 'string', example: 'The payment method with the id 64f8a1b2c3d4e5f6a7b8c9d0 cannot be found' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T12:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 409,
        description: 'Conflit - Un autre moyen de paiement utilise déjà ce nom',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 409 },
                message: { type: 'string', example: 'A payment method with this name already exists' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T12:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 500,
        description: 'Erreur interne du serveur lors de la mise à jour',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 500 },
                message: { type: 'string', example: 'An internal error has occurred' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T12:00:00.439Z' }
            }
        }
    })
    async updatePaymentMethod(@Body() updatePaymentMethodDto: UpdatePaymentMethodDTO, @Param("id", ObjectIDValidationPipe) id: string, @Req() req: Request) {
        return await this.paymentMethodService.updatePaymentMethod(updatePaymentMethodDto, id, req);
    }

    @CustomMessage('Payment method(s) successfully deleted for the specified application')
    @Put('app-remove/:id')
    @ApiBearerAuth()
    @ApiOperation({
        summary: 'Retirer des moyens de paiement d\'une application spécifique',
        description: `
        Cette route permet de dissocier un ou plusieurs moyens de paiement d'une application cliente.
        Les moyens de paiement retirés ne seront plus disponibles pour les nouvelles transactions de cette application.
        
        **Fonctionnalités principales :**
        - Dissociation multiple de moyens de paiement en une seule requête
        - Vérification de l'existence et de la validité de l'application cible
        - Validation de l'association actuelle des moyens de paiement
        - Protection contre la suppression de tous les moyens de paiement
        - Opération atomique avec gestion des transactions
        
        **Permissions requises :**
        - Authentification JWT valide obligatoire
        - Propriétaire de l'application OU rôle administrateur
        - Vérification stricte de l'appartenance de l'application
        
        **Règles métier critiques :**
        - L'application doit exister et être active
        - Les moyens de paiement doivent être actuellement associés à l'application
        - Au moins un moyen de paiement doit rester associé (sécurité)
        - L'opération est réversible (les moyens peuvent être ré-ajoutés)
        - Les associations sont supprimées de manière logique
        
        **Impact sur le système :**
        - Les nouveaux paiements ne pourront plus utiliser ces moyens
        - Les transactions en cours ou terminées ne sont jamais affectées
        - L'historique complet des transactions est préservé
        - Les webhooks de notification informent du changement
        - Les interfaces utilisateur sont mises à jour automatiquement
        `
    })
    @ApiParam({
        name: 'id',
        description: 'ID MongoDB unique de l\'application cible dont retirer les moyens de paiement',
        type: 'string',
        example: '64f8a1b2c3d4e5f6a7b8c9d2',
        schema: {
            pattern: '^[0-9a-fA-F]{24}$'
        }
    })
    @ApiBody({
        description: 'Liste des IDs des moyens de paiement à dissocier de l\'application spécifiée',
        schema: {
            type: 'object',
            required: ['paymentMethods'],
            properties: {
                paymentMethods: {
                    type: 'array',
                    items: { 
                        type: 'string',
                        pattern: '^[0-9a-fA-F]{24}$',
                        description: 'ID MongoDB valide d\'un moyen de paiement actuellement associé'
                    },
                    minItems: 1,
                    maxItems: 15,
                    uniqueItems: true,
                    description: 'Tableau des IDs MongoDB des moyens de paiement à retirer (maximum 15)',
                    example: ['64f8a1b2c3d4e5f6a7b8c9d0']
                }
            },
            additionalProperties: false
        },
        examples: {
            removeSinglePaymentMethod: {
                summary: 'Retirer un seul moyen de paiement',
                description: 'Exemple de suppression d\'un moyen de paiement MTN Money',
                value: {
                    paymentMethods: ['64f8a1b2c3d4e5f6a7b8c9d0']
                }
            },
            removeMultiplePaymentMethods: {
                summary: 'Retirer plusieurs moyens de paiement',
                description: 'Exemple de suppression de MTN Money et Orange Money',
                value: {
                    paymentMethods: [
                        '64f8a1b2c3d4e5f6a7b8c9d0',
                        '64f8a1b2c3d4e5f6a7b8c9d1'
                    ]
                }
            },
            removeInactivePaymentMethods: {
                summary: 'Retirer les moyens de paiement inactifs',
                description: 'Exemple de nettoyage des moyens de paiement désactivés',
                value: {
                    paymentMethods: [
                        '64f8a1b2c3d4e5f6a7b8c9d3',
                        '64f8a1b2c3d4e5f6a7b8c9d4'
                    ]
                }
            }
        }
    })
    @ApiResponse({
        status: 200,
        description: 'Moyens de paiement retirés avec succès de l\'application',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 200 },
                message: { type: 'string', example: 'Payment method(s) successfully deleted for the specified application' },
                data: {
                    type: 'object',
                    nullable: true,
                    example: null,
                    description: 'Aucune donnée spécifique retournée pour cette opération de suppression'
                },
                timestamp: { 
                    type: 'string', 
                    format: 'date-time', 
                    example: '2024-01-15T13:00:00.439Z' 
                }
            }
        }
    })
    @ApiResponse({
        status: 400,
        description: 'Données de requête invalides ou tentative de suppression de tous les moyens de paiement',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 400 },
                message: { 
                    type: 'string', 
                    example: 'Cannot remove all payment methods from application. At least one must remain.'
                },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T13:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 401,
        description: 'Token d\'authentification manquant, invalide ou expiré'
    })
    @ApiResponse({
        status: 403,
        description: 'Accès refusé - Vous n\'êtes pas propriétaire de cette application',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 403 },
                message: { type: 'string', example: 'You do not have permission to modify this application' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T13:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 404,
        description: 'Application non trouvée ou moyens de paiement non associés à cette application',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 404 },
                message: { 
                    type: 'string', 
                    example: 'Some of the payment method passed cannot be founded or are not associated with this application'
                },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T13:00:00.439Z' }
            }
        }
    })
    @ApiResponse({
        status: 500,
        description: 'Erreur interne du serveur lors de la suppression',
        schema: {
            type: 'object',
            properties: {
                statusCode: { type: 'number', example: 500 },
                message: { type: 'string', example: 'An internal error has occurred' },
                data: { type: 'null', example: null },
                timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T13:00:00.439Z' }
            }
        }
    })
    async deletePaymentMethods(@Body() updatePaymentMethodsTableDto: UpdatePaymentMethodTableDTO, @Param("id", ObjectIDValidationPipe) id: string) {
        return await this.paymentMethodService.deletePaymentMethods(updatePaymentMethodsTableDto, id);
    }

}
