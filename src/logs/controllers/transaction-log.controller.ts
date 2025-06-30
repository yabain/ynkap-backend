import { Controller, Get, Post, Body, Query, Delete, Param, Res } from '@nestjs/common';
import { TransactionLogService } from '../services/transaction-log.service';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Roles } from 'src/keycloak/keycloak.decorator';
import { CreateLogDto } from '../dto/create-log.dto';
import { Response } from 'express';

@ApiTags('Transaction Logs')
@ApiBearerAuth()
@Controller('transaction-logs')
export class TransactionLogController {
  constructor(private readonly transactionLogService: TransactionLogService) {}

  @Get()
  @Roles(['admin'])
  @ApiOperation({ summary: 'Récupérer tous les logs de transactions' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre maximum de logs à récupérer' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Nombre de logs à sauter (pour la pagination)' })
  @ApiResponse({ status: 200, description: 'Liste des logs de transactions' })
  async findAll(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
  ) {
    const logs = await this.transactionLogService.findAll(limit, skip);
    const total = await this.transactionLogService.count();
    
    return {
      data: logs,
      total,
      limit: limit || 0,
      skip: skip || 0
    };
  }

  @Get(':id')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Récupérer un log de transaction par son ID' })
  @ApiParam({ name: 'id', description: 'ID du log de transaction' })
  @ApiResponse({ status: 200, description: 'Log de transaction trouvé' })
  @ApiResponse({ status: 404, description: 'Log de transaction non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.transactionLogService.getTransactionLogs(id);
  }

  @Post()
  @Roles(['admin'])
  @ApiOperation({ summary: 'Créer un nouveau log de transaction' })
  @ApiResponse({ status: 201, description: 'Log de transaction créé avec succès' })
  async create(@Body() createLogDto: CreateLogDto) {
    return this.transactionLogService.create(createLogDto);
  }

  @Delete(':id')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Supprimer un log de transaction' })
  @ApiParam({ name: 'id', description: 'ID du log de transaction à supprimer' })
  @ApiResponse({ status: 200, description: 'Log de transaction supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Log de transaction non trouvé' })
  async delete(@Param('id') id: string) {
    return this.transactionLogService.delete(id);
  }

  @Get('export/csv')
  @Roles(['admin'])
  @ApiOperation({ summary: 'Exporter les logs de transactions au format CSV' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Nombre maximum de logs à exporter' })
  @ApiQuery({ name: 'skip', required: false, type: Number, description: 'Nombre de logs à sauter' })
  @ApiResponse({ status: 200, description: 'Logs de transactions exportés avec succès' })
  async exportCsv(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Res() res?: Response
  ) {
    const logs = await this.transactionLogService.findAll(limit, skip);
    
    // Si res n'est pas fourni, retourner simplement les logs
    if (!res) {
      return logs;
    }
    
    // Convertir en CSV
    const csv = this.convertToCSV(logs);
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transaction_logs_${new Date().toISOString().replace(/:/g, '-')}.csv`);
    return res.send(csv);
  }

  private convertToCSV(logs: any[]): string {
    // Implémentation de la conversion en CSV
    const header = 'ID,Level,Message,User,TransactionID,Amount,Status,PaymentMethod,Date\n';
    const rows = logs.map(log => {
      const metadata = log.metadata || {};
      const date = log.createdAt ? new Date(log.createdAt).toISOString() : '';
      return `"${log._id}","${log.level}","${log.message.replace(/"/g, '""')}","${log.user || ''}","${metadata.transactionId || ''}","${metadata.amount || '0'}","${metadata.status || ''}","${metadata.paymentMethod || ''}","${date}"`;
    });
    
    return header + rows.join('\n');
  }
}


