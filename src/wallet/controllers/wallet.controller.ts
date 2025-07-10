import { Controller, Get, HttpStatus, Param, Req, UseInterceptors, Put, Body, Post, Delete, NotFoundException, BadRequestException } from "@nestjs/common";
import { Public } from "nest-keycloak-connect";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { WalletService } from "../services/wallet.services";
import mongoose from "mongoose";
import { ApiOperation, ApiParam, ApiResponse, ApiTags, ApiBody } from "@nestjs/swagger";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { UpdateWalletDTO } from '../dtos/update-wallet.dto';
import { CreateWalletDTO } from '../dtos/create-wallet.dto';

@Controller("wallet")
@UseInterceptors(TransformResponeInterceptor)
@ApiTags('Wallet')
export class WalletController
{
    constructor(
        private walletService:WalletService
    ){}

    @CustomMessage('Wallet informations successfully retrieved')
    @ApiOperation({
        summary: "Get wallet informations for a specific application",
        description: "This method provides wallet informations of a specific application"
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiResponse({status: HttpStatus.OK, description: "wallet details",
        example: {
            "statusCode": 200,
            "message": "Wallet informations successfully retrieved",
            "data" : {
                "_id": "66bf8a89203d5fab750c0f42",
                "amount": 25,
                "application": "66bf8a89203d5fab750c0f63",
                "createdAt": "2024-11-29T07:09:10.949Z"
            }
        }
    })
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the id passed in parameter cannot be found", 
        example: 
        {
            "statusCode": 200,
            "message": "Wallet informations successfully retrieved",
            "data": null
        }
    })
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak",
        example:
        {
            "statusCode": 401,
            "message": "Unauthorized",
            "data": null,
            "timestamp": "2024-11-29T09:38:06.439Z"
        }
    })
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occured",
        example:
        {
            "statusCode": 500,
            "message": "An internal error has occurred",
            "data": null,
            "timestamp": "2024-11-29T09:38:06.439Z"
        }
    })
    @Get(":appID")
    @Public()
    async getWalletFromAppID(@Req() request:Request, @Param("appID", ObjectIDValidationPipe) appID:string)
    {
        return await this.walletService.findOneByField({'application':new mongoose.Types.ObjectId(appID)})
    }

    @CustomMessage('Wallet successfully updated')
    @ApiOperation({
        summary: "Update wallet amount for a specific application",
        description: "This method updates the wallet amount of a specific application"
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', example: 100 }
            },
            required: ['amount']
        }
    })
    @ApiResponse({status: HttpStatus.OK, description: "Wallet updated successfully",
        example: {
            "statusCode": 200,
            "message": "Wallet successfully updated",
            "data" : {
                "_id": "66bf8a89203d5fab750c0f42",
                "amount": 100,
                "application": "66bf8a89203d5fab750c0f63",
                "createdAt": "2024-11-29T07:09:10.949Z"
            }
        }
    })
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The wallet for the specified application cannot be found"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid amount value"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @Put(":appID")
    async updateWalletAmount(
        @Param("appID", ObjectIDValidationPipe) appID: string,
        @Body() updateWalletDto: UpdateWalletDTO
    ) {
        return await this.walletService.updateWalletAmount(appID, updateWalletDto.amount);
    }

    @CustomMessage('Wallet successfully created')
    @ApiOperation({
        summary: "Create wallet for a specific application",
        description: "This method creates a wallet for a specific application if it doesn't exist"
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', example: 0, default: 0 }
            }
        }
    })
    @ApiResponse({status: HttpStatus.CREATED, description: "Wallet created successfully"})
    @ApiResponse({status: HttpStatus.CONFLICT, description: "A wallet already exists for this application"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid application ID or amount"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    @ApiResponse({status: HttpStatus.INTERNAL_SERVER_ERROR, description: "An unexpected error occurred"})
    @Post(":appID")
    async createWallet(
        @Param("appID", ObjectIDValidationPipe) appID: string,
        @Body() createWalletDto: CreateWalletDTO = { amount: 0 }
    ) {
        return await this.walletService.createOrUpdateWallet(appID, createWalletDto.amount || 0);
    }

    @Delete(":appID")
    @CustomMessage('Wallet successfully deleted')
    @ApiOperation({
        summary: "Delete wallet for a specific application",
        description: "This method deletes a wallet for a specific application if it has no funds"
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiResponse({status: HttpStatus.OK, description: "Wallet deleted successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The wallet for the specified application cannot be found"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "The wallet still has funds"})
    @ApiResponse({status: HttpStatus.UNAUTHORIZED, description: "The request did not authenticate with keycloak"})
    async deleteWallet(@Param("appID", ObjectIDValidationPipe) appID: string) {
        // Vérifier si le portefeuille existe et s'il a des fonds
        const wallet = await this.walletService.findOneByField({'application': new mongoose.Types.ObjectId(appID)});
        
        if (!wallet) {
            throw new NotFoundException(`No wallet found for application ${appID}`);
        }
        
        if (wallet.amount > 0) {
            throw new BadRequestException(`Please transfer all funds from the wallet before deleting it`);
        }
        
        return await this.walletService.delete({'application': new mongoose.Types.ObjectId(appID)});
    }

    @CustomMessage('Funds added to wallet successfully')
    @ApiOperation({
        summary: "Add funds to wallet for a specific application",
        description: "This method adds funds to the wallet of a specific application"
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiBody({ 
        schema: {
            type: 'object',
            properties: {
                amount: { type: 'number', example: 100 }
            },
            required: ['amount']
        }
    })
    @ApiResponse({status: HttpStatus.OK, description: "Funds added to wallet successfully"})
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The wallet for the specified application cannot be found"})
    @ApiResponse({status: HttpStatus.BAD_REQUEST, description: "Invalid amount value"})
    @Post(":appID/add")
    async addToWalletAmount(
        @Param("appID", ObjectIDValidationPipe) appID: string,
        @Body() updateWalletDto: UpdateWalletDTO
    ) {
        return await this.walletService.addToWalletAmount(appID, updateWalletDto.amount);
    }
}
