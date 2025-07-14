import { Controller, Get, HttpStatus, Req, UseInterceptors } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
    description: 'This endpoint provides statistics for the dashboard including user count, device type, transaction count, and application count'
  })
  @ApiResponse({
    status: HttpStatus.OK, 
    description: 'Dashboard statistics',
    type: DashboardStatsDTO
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED, 
    description: 'The request did not authenticate with keycloak'
  })
  @ApiResponse({
    status: HttpStatus.INTERNAL_SERVER_ERROR, 
    description: 'An unexpected error occurred'
  })
  async getDashboardStats(@Req() req: Request): Promise<DashboardStatsDTO> {
    return await this.dashboardService.getDashboardStats(req);
  }
}