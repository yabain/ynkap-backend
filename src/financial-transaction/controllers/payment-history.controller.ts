import { Body, Controller, Post, UseGuards,Req, HttpStatus, Get, Param, ParseUUIDPipe, UseInterceptors } from "@nestjs/common";
import { Request } from "express";
import { AuthJwtGuard as AppAuthJwtGuard } from "src/application/guards"
import { CreateFinancialTransactionDTO } from "../dtos"
import { FinancialTransactionService, PaymentService } from "../services"
import { OrangeMoneyUpdateFinancialTransactionStatus } from "../dtos/orange-money-update-financial-transaction.dto";
import { Public } from "nest-keycloak-connect";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import mongoose from "mongoose";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";

@Public()
@UseInterceptors(TransformResponeInterceptor)
@Controller("payment-history")
@ApiTags('Transaction-History')
export class PaymentHistoryController
{
    constructor(private paymentService:PaymentService,
        private financialTransactionService:FinancialTransactionService,

    ){}

    @ApiOperation({
        summary: "Get all payment transaction history for a specific application ",
        description: "This method returns all payment transaction history for a specific application "
    })
    @ApiParam({ name: 'appID', description: 'ID of the application', example: "66bf8a89203d5fab750c0f63"})
    @ApiResponse({status: HttpStatus.OK, description: "Transaction-payment history details",
        example: 
        {
            "statusCode": 200,
            "message": "Opération réussie",
            "data": [
                {
                    "userRef": {
                        "fullName": "Cédric Nguendap",
                        "account": "698295368"
                    },
                    "_id": "67496c55e555b20e77d3d56a",
                    "state": "financial_transaction_pending",
                    "amount": 25,
                    "raison": "Paiement de frais de scolarité",
                    "type": "deposit",
                    "ref": "REF1732864911941",
                    "token": "MP241129DD2D67ABACD8CC4D4496",
                    "error": 0,
                    "paymentMode": "ORANGE",
                    "application": "6749689642bafee2045b382c",
                    "moneyCode": "XAF",
                    "wallet": "6749689642bafee2045b382e",
                    "createdAt": "2024-11-29T07:21:51.941Z",
                    "startDate": "2024-11-29T07:25:14.895Z",
                    "endDate": "2024-11-29T07:25:14.895Z"
                },
                {
                    "userRef": {
                        "fullName": "Cédric Nguendap",
                        "account": "698295368"
                    },
                    "_id": "67496cf007a47b6052daae0f",
                    "state": "financial_transaction_pending",
                    "amount": 25,
                    "raison": "Paiement de frais de scolarité",
                    "type": "deposit",
                    "ref": "REF1732865256294",
                    "token": "MP241129BA2057EB22C502CD98B8",
                    "error": 0,
                    "paymentMode": "ORANGE",
                    "application": "6749689642bafee2045b382c",
                    "moneyCode": "XAF",
                    "wallet": "6749689642bafee2045b382e",
                    "createdAt": "2024-11-29T07:27:36.294Z",
                    "startDate": "2024-11-29T07:27:50.413Z",
                    "endDate": "2024-11-29T07:27:50.413Z"
                }
            ]
        }
    })
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the id passed in parameter cannot be found", 
        example: 
        {
            "statusCode": 200,
            "message": "Opération réussie",
            "data": []
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
    // @UseGuards(AppAuthJwtGuard)
    @Public()
    @Get(":appID")    
    async checkPayment(@Req() request:Request, @Param("appID", ObjectIDValidationPipe) appID:string)
    {
        return await this.financialTransactionService.findByField({application:new mongoose.Types.ObjectId(appID)})  
    }
}