import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { LogService } from '../services/log.service';
import { TransactionLogService } from '../services/transaction-log.service';

@ApiTags('Unified Logs')
@Controller('unified-logs')
export class UnifiedLogController {
  constructor(
    private readonly logService: LogService,
    private readonly transactionLogService: TransactionLogService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Récupérer tous les logs (transactions + activités) avec structure unifiée' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'skip', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: ['TRANSACTION', 'ACTIVITY', 'ACTION'] })
  async getAllLogs(
    @Query('limit') limit?: number,
    @Query('skip') skip?: number,
    @Query('type') type?: string,
  ) {
    if (!limit || limit > 100) {
      limit = 100;
    }

    let filter = {};
    if (type) {
      filter = { type };
    }

    const logs = await this.logService.findAll(filter, limit, skip);
    const total = await this.logService.count(filter);

    // Structure unifiée pour tous les logs
    const unifiedLogs = logs.map(log => ({
      _id: log._id,
      level: log.level,
      type: log.type,
      message: log.message,
      user: log.user,
      metadata: log.metadata,
      createdAt: log.createdAt
    }));

    return {
      data: unifiedLogs,
      total,
      limit: limit || 0,
      skip: skip || 0
    };
  }
}