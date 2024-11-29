import { Body, Controller, Post, UseGuards,Req, HttpStatus, Get, Param, ParseUUIDPipe, UseInterceptors } from "@nestjs/common";
import { Request } from "express";
import { AuthJwtGuard as AppAuthJwtGuard } from "src/application/guards"
import { CreateFinancialTransactionDTO } from "../dtos"
import { PaymentService } from "../services"
import { OrangeMoneyUpdateFinancialTransactionStatus } from "../dtos/orange-money-update-financial-transaction.dto";
import { Public } from "nest-keycloak-connect";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";

@Public()
@UseInterceptors(TransformResponeInterceptor)
@Controller("payment")
@ApiTags('Payment-Transaction')
export class PaymentController
{
    constructor(private paymentService:PaymentService){}

    @ApiOperation({
        summary: "Initiate a new transaction payment",
        description: "This method initiates a new payment transaction with the specified operator"
    })
    @ApiResponse({status: HttpStatus.CREATED, description: "Transcation details",
        example: 
        {
            "statusCode": 201,
            "message": "Opération réussie",
            "data": {
                "userRef": {
                    "fullName": "Cédric Nguendap",
                    "account": "697412563"
                },
                "_id": "67498d726ea207be4ee7e0dc",
                "state": "financial_transaction_pending",
                "amount": 30,
                "raison": "Paiement de frais de scolarité",
                "type": "deposit",
                "ref": "REF1732873412564",
                "token": "MP2411294652097496B00B0AA307",
                "error": 0,
                "paymentMode": "ORANGE",
                "application": "6749689642bafee2045b382c",
                "moneyCode": "XAF",
                "wallet": "6749689642bafee2045b382e",
                "createdAt": "2024-11-29T09:43:32.564Z",
                "startDate": "2024-11-29T09:46:29.877Z",
                "endDate": "2024-11-29T09:46:29.877Z"
            }
        }
    })
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The application with the id passed in parameter cannot be found", 
        example: 
        {
            "statusCode": 404,
            "message": "APP id 6749689642bafee2045b382b not found",
            "data": null,
            "timestamp": "2024-11-29T09:56:00.254Z"
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
    @Post("pay")    
    async makePayment(@Req() request:Request, @Body() createFinancialTransactionDTO:CreateFinancialTransactionDTO)
    {
        return await this.paymentService.makePayment(createFinancialTransactionDTO)     
    }

    @Post("orange-money-notify-payment")    
    async orangeMoneyNotifyPayment(@Req() request:Request, @Body() orangeMoneyUpdateFinancialTransactionStatus)
    {
        //OrangeMoneyUpdateFinancialTransactionStatus
        return await this.paymentService.updatePayementStatus(orangeMoneyUpdateFinancialTransactionStatus.payToken,orangeMoneyUpdateFinancialTransactionStatus.status)      
    }


    @ApiOperation({
        summary: "Get payment-transaction status",
        description: "This method is used to check the status of the payment transaction. "
    })
    @ApiParam({ name: 'ref', description: 'Unique reference of a specific transaction', example: "MP241129870A5D7CB34E6E63F86C"})
    @ApiResponse({status: HttpStatus.OK, description: "Transaction status details",
        example: 
        {
            "statusCode": 200,
            "message": "Opération réussie",
            "data": {
                "userRef": {
                    "fullName": "Cédric Nguendap",
                    "account": "697412563"
                },
                "_id": "67496f52146c3a985bdcc470",
                "state": "financial_transaction_error",
                "amount": 25,
                "raison": "Paiement de frais de scolarité",
                "type": "deposit",
                "ref": "REF1732865852808",
                "token": "MP241129870A5D7CB34E6E63F86C",
                "error": -207,
                "paymentMode": "ORANGE",
                "application": "6749689642bafee2045b382c",
                "moneyCode": "XAF",
                "wallet": "6749689642bafee2045b382e",
                "createdAt": "2024-11-29T07:37:32.808Z",
                "startDate": "2024-11-29T07:38:00.923Z",
                "endDate": "2024-11-29T07:55:14.241Z"
            }
        }
    })
    @ApiResponse({status: HttpStatus.NOT_FOUND, description: "The transaction with the token passed in parameter cannot be found", 
        example: 
        {
            "statusCode": 404,
            "message": "Transaction token ${Token} not found",
            "data": null,
            "timestamp": "2024-11-29T09:56:00.254Z"
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
    @Get("check/:ref")    
    async checkPayment(@Req() request:Request, @Param("ref") ref:string)
    {
        return await this.paymentService.checkPayment(ref)  
    }
}