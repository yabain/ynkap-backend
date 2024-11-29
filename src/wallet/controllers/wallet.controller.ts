import { Controller, Get, HttpStatus, Param, Req, UseInterceptors } from "@nestjs/common";
import { Public } from "nest-keycloak-connect";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { WalletService } from "../services";
import mongoose from "mongoose";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";

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
}