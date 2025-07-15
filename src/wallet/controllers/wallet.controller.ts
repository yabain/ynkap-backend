import { Controller, Get, Put, Param, Body, Logger } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiBody, ApiResponse, ApiTags } from '@nestjs/swagger';
import { WalletService } from '../services/wallet.service';

@ApiTags('Wallets')
@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  @Get(':id')
  @ApiOperation({ summary: 'Get wallet by ID' })
  @ApiParam({ name: 'id', description: 'Wallet ID' })
  @ApiResponse({ status: 200, description: 'Wallet found' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  async getWalletById(@Param('id') id: string) {
    this.logger.log(`Request received for wallet ID: ${id}`);
    
    try {
      const startTime = Date.now();
      const wallet = await this.walletService.getAmount(id);
      const duration = Date.now() - startTime;
      
      this.logger.log(`Successfully retrieved wallet with ID: ${id} in ${duration}ms`);
      return wallet;
    } catch (error) {
      this.logger.error(`Error retrieving wallet with ID ${id}: ${error.message}`);
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update wallet amount by application ID' })
  @ApiParam({ name: 'id', description: 'Application ID' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', minimum: 0 }
      },
      required: ['amount']
    }
  })
  @ApiResponse({ status: 200, description: 'Wallet updated successfully' })
  @ApiResponse({ status: 404, description: 'Wallet not found' })
  @ApiResponse({ status: 400, description: 'Invalid amount' })
  async updateWalletAmount(
    @Param('id') appId: string,
    @Body() updateData: { amount: number }
  ) {
    this.logger.log(`Request to update wallet for application ID: ${appId} with amount: ${updateData.amount}`);
    
    try {
      const updatedWallet = await this.walletService.updateWalletAmount(appId, updateData.amount);
      this.logger.log(`Successfully updated wallet for application ${appId}`);
      return updatedWallet;
    } catch (error) {
      this.logger.error(`Error updating wallet for application ${appId}: ${error.message}`);
      throw error;
    }
  }
}
