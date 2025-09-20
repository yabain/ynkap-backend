import { Controller, Get, HttpStatus, Req, UseInterceptors, Query } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { DashboardService } from '../services/dashboard.service';
import { DashboardStatsDTO } from '../dtos/dashboard-stats.dto';
import { TransformResponeInterceptor } from '../../shared/interceptors/transform-response.interceptor';
import { CustomMessage } from '../../shared/decorators/custom-message.decorator';

@Controller('dashboard')
@ApiTags('Dashboard')
@UseInterceptors(TransformResponeInterceptor)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @CustomMessage('Dashboard statistics successfully retrieved')
  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: `
    This endpoint provides statistics for the dashboard including user count, payment method, 
    transaction count, and application count. Transactions are grouped by year for better filtering.
    
    **Query Parameters:**
    - \`year\`: Filter transactions by specific year (optional)
    - \`limit\`: Limit number of transactions per year (default: 100)
    
    **Examples:**
    - Get all years: \`GET /dashboard/stats\`
    - Get specific year: \`GET /dashboard/stats?year=2024\`
    - Limit transactions: \`GET /dashboard/stats?year=2024&limit=50\`
    `
  })
  @ApiQuery({
    name: 'year',
    required: false,
    type: Number,
    description: 'Filter transactions by year (e.g., 2024)',
    example: 2024
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Limit number of transactions per year (default: 100)',
    example: 100
  })
  @ApiResponse({
    status: HttpStatus.OK, 
    description: 'Dashboard statistics with transactions grouped by year',
    type: DashboardStatsDTO
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED, 
    description: 'The request did not authenticate with keycloak'
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST, 
    description: 'Invalid year parameter'
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR, 
    description: 'An unexpected error occurred'
  })
  async getDashboardStats(
    @Req() req: Request,
    @Query('year') year?: number,
    @Query('limit') limit?: number
  ): Promise<DashboardStatsDTO> {
    // Validation du paramètre année
    if (year && (isNaN(year) || year < 2000 || year > new Date().getFullYear() + 1)) {
      throw new Error('Invalid year parameter. Must be between 2000 and current year + 1');
    }

    return await this.dashboardService.getDashboardStats(req, year, limit || 100);
  }
}
