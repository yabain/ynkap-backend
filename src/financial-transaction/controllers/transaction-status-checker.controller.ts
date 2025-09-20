import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TransactionStatusCheckerService } from '../services/transaction-status-checker.service';
import { Public } from 'nest-keycloak-connect';

@Controller('transaction-status-checker')
@ApiTags('Transaction Status Checker')
@Public()
export class TransactionStatusCheckerController {
    constructor(
        private readonly transactionStatusCheckerService: TransactionStatusCheckerService
    ) {}

    @Post('trigger-manual-check')
    @ApiOperation({
        summary: 'Déclencher manuellement la vérification des transactions PENDING',
        description: 'Force l\'exécution du Cron Job pour vérifier immédiatement toutes les transactions PENDING'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Vérification manuelle déclenchée avec succès',
        schema: {
            type: 'object',
            properties: {
                message: { type: 'string', example: 'Vérification manuelle des transactions PENDING déclenchée' },
                timestamp: { type: 'string', example: '2025-09-12T10:30:00.000Z' }
            }
        }
    })
    async triggerManualCheck() {
        await this.transactionStatusCheckerService.triggerManualCheck();
        return {
            message: 'Vérification manuelle des transactions PENDING déclenchée',
            timestamp: new Date().toISOString()
        };
    }

    @Get('pending-stats')
    @ApiOperation({
        summary: 'Obtenir les statistiques des transactions PENDING',
        description: 'Retourne des statistiques détaillées sur les transactions en attente'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Statistiques des transactions PENDING récupérées avec succès',
        schema: {
            type: 'object',
            properties: {
                totalPending: { type: 'number', example: 5 },
                byPaymentMode: { 
                    type: 'object',
                    example: { 'ORANGE': 3, 'MTN': 2 }
                },
                oldestTransaction: {
                    type: 'object',
                    properties: {
                        ref: { type: 'string', example: 'REF1234567890' },
                        createdAt: { type: 'string', example: '2025-09-12T08:00:00.000Z' },
                        paymentMode: { type: 'string', example: 'ORANGE' }
                    }
                },
                newestTransaction: {
                    type: 'object',
                    properties: {
                        ref: { type: 'string', example: 'REF0987654321' },
                        createdAt: { type: 'string', example: '2025-09-12T10:00:00.000Z' },
                        paymentMode: { type: 'string', example: 'MTN' }
                    }
                }
            }
        }
    })
    async getPendingStats() {
        const stats = await this.transactionStatusCheckerService.getPendingTransactionsStats();
        return {
            ...stats,
            timestamp: new Date().toISOString()
        };
    }

    @Get('cron-status')
    @ApiOperation({
        summary: 'Vérifier le statut du Cron Job',
        description: 'Retourne des informations sur le statut et la configuration du Cron Job'
    })
    @ApiResponse({ 
        status: 200, 
        description: 'Statut du Cron Job récupéré avec succès',
        schema: {
            type: 'object',
            properties: {
                cronJobName: { type: 'string', example: 'check-pending-transactions' },
                schedule: { type: 'string', example: '*/2 * * * *' },
                description: { type: 'string', example: 'Vérifie les transactions PENDING toutes les 2 minutes' },
                timeZone: { type: 'string', example: 'Africa/Douala' },
                isActive: { type: 'boolean', example: true },
                nextExecution: { type: 'string', example: '2025-09-12T10:32:00.000Z' }
            }
        }
    })
    async getCronStatus() {
        const now = new Date();
        const nextExecution = new Date(now.getTime() + (2 * 60 * 1000)); // Prochaine exécution dans 2 minutes max

        return {
            cronJobName: 'check-pending-transactions',
            schedule: '*/2 * * * *',
            description: 'Vérifie les transactions PENDING toutes les 2 minutes',
            timeZone: 'Africa/Douala',
            isActive: true,
            nextExecution: nextExecution.toISOString(),
            currentTime: now.toISOString()
        };
    }
}
