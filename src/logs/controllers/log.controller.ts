import { Controller, Get, Post, Body, Query, Param, Delete } from '@nestjs/common';
import { LogService } from '../services/log.service';
import { CreateLogDto } from '../dto/create-log.dto';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { CreateActionLogDto } from '../dtos/create-action-log.dto';
import { LogType } from '../enums/log-type.enum';

@ApiTags('Logs')
@Controller('logs')
export class LogController {
  constructor(private readonly logService: LogService) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les logs' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'filter', required: false, type: String, description: 'Filtre au format JSON' })
  @ApiResponse({ status: 200, description: 'Liste des logs récupérée avec succès' })
  async findAll(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('filter') filterStr?: string,
  ) {
    let filter = {};
    
    // Vérifier si filterStr est défini avant d'appeler split
    if (filterStr && typeof filterStr === 'string') {
      try {
        filter = JSON.parse(filterStr);
      } catch (error) {
        // Si le parsing échoue, utiliser un filtre vide
        console.error('Erreur de parsing du filtre:', error);
      }
    }
    
    // Limiter le nombre de logs récupérés si aucune limite n'est spécifiée
    if (!limit || limit > 100) {
      limit = 100; // Limiter à 100 logs par défaut
    }
    
    const logs = await this.logService.findAll(filter, limit, skip);
    const total = await this.logService.count(filter);
    
    return {
      data: logs,
      total,
      limit: limit || 0,
      skip: skip || 0
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Récupérer un log par son ID' })
  @ApiResponse({ status: 200, description: 'Log récupéré avec succès' })
  @ApiResponse({ status: 404, description: 'Log non trouvé' })
  async findOne(@Param('id') id: string) {
    return this.logService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un nouveau log' })
  @ApiResponse({ status: 201, description: 'Log créé avec succès' })
  async create(@Body() createLogDto: CreateLogDto) {
    return this.logService.create(createLogDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer un log' })
  @ApiResponse({ status: 200, description: 'Log supprimé avec succès' })
  @ApiResponse({ status: 404, description: 'Log non trouvé' })
  async remove(@Param('id') id: string) {
    return this.logService.delete(id);
  }

  @Post('action')
  @ApiOperation({ summary: 'Créer un log d\'action' })
  @ApiResponse({ status: 201, description: 'Log d\'action créé avec succès' })
  async createActionLog(@Body() createActionLogDto: CreateActionLogDto) {
    return this.logService.createActionLog(
      createActionLogDto.action,
      createActionLogDto.details,
      createActionLogDto.userId,
      createActionLogDto.metadata
    );
  }

  @Get('actions')
  @ApiOperation({ summary: 'Récupérer les logs d\'actions' })
  async getActionLogs(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('action') action?: string,
    @Query('userId') userId?: string
  ) {
    const filter: any = { type: LogType.ACTION };
    
    if (action) {
      filter['metadata.action'] = action;
    }
    
    if (userId) {
      filter.user = userId;
    }
    
    const logs = await this.logService.findAll(filter, limit, skip);
    return this.formatActionLogsResponse(logs);
  }

  private formatActionLogsResponse(logs: any[]) {
    return logs.map(log => ({
      id: log._id,
      action: log.metadata?.action || 'UNKNOWN',
      details: log.metadata?.details || log.message,
      user: log.user || 'SYSTEM',
      timestamp: log.createdAt,
      result: log.metadata?.result || 'SUCCESS',
      target: log.metadata?.target,
      ipAddress: log.metadata?.ipAddress,
      duration: log.metadata?.duration
    }));
  }
}



