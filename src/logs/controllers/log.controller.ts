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
  async findAll(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('filter') filterStr?: string,
  ) {
    let filter = {};
    
    if (filterStr && typeof filterStr === 'string') {
      try {
        filter = JSON.parse(filterStr);
      } catch (error) {
        console.error('Erreur de parsing du filtre:', error);
      }
    }
    
    if (!limit || limit > 100) {
      limit = 100;
    }
    
    const logs = await this.logService.findAll(filter, limit, skip);
    const total = await this.logService.count(filter);
    
    // Structure unifiée pour tous les logs
    const formattedLogs = logs.map(log => ({
      _id: log._id,
      level: log.level,
      type: log.type,
      message: log.message,
      user: log.user,
      metadata: log.metadata,
      createdAt: log.createdAt
    }));
    
    return {
      data: formattedLogs,
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




