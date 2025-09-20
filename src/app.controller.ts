import { Controller, Get, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from 'nest-keycloak-connect';

@ApiTags('System Health')
@Controller('')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  @Public() 
  @ApiOperation({
    summary: 'Vérification de l\'état de l\'API Y-Nkap',
    description: `
    Cette route racine permet de vérifier que l'API Y-Nkap fonctionne correctement.
    Elle est utilisée pour le monitoring de santé et la vérification de connectivité.
    
    **Fonctionnalités :**
    - Vérification de l'état opérationnel de l'API
    - Retour de la version actuelle du service
    - Endpoint de monitoring pour les outils de surveillance
    - Test de connectivité rapide sans authentification
    
    **Utilisation typique :**
    - Health checks automatisés
    - Monitoring de production
    - Tests de connectivité
    - Vérification de déploiement
    
    **Aucune authentification requise** - Endpoint public pour faciliter le monitoring
    `
  })
  @ApiResponse({
    status: HttpStatus.OK, 
    description: 'API opérationnelle - Version et statut retournés',
    schema: {
      type: 'string',
      example: 'Y-Nkap Payment API v2.1.0 - Service operational',
      description: 'Message confirmant le bon fonctionnement de l\'API avec sa version'
    }
  })
  @ApiResponse({ 
    status: HttpStatus.SERVICE_UNAVAILABLE, 
    description: 'Service temporairement indisponible',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 503 },
        message: { type: 'string', example: 'Service temporarily unavailable' },
        timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
      }
    }
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR,
    description: 'Erreur interne du serveur',
    schema: {
      type: 'object',
      properties: {
        statusCode: { type: 'number', example: 500 },
        message: { type: 'string', example: 'Internal server error' },
        timestamp: { type: 'string', format: 'date-time', example: '2024-01-15T10:30:00.439Z' }
      }
    }
  })
  getMainRoad(): string {
    return this.appService.getVersion();
  }
}
  
