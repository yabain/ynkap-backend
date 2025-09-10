import { Body, Controller, Post, UseGuards, Req, HttpStatus, Get, Param, ParseUUIDPipe, UseInterceptors, NotFoundException } from "@nestjs/common";
        import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiBody } from '@nestjs/swagger';
        import { Request } from "express";
        import { AuthJwtGuard as AppAuthJwtGuard } from "src/application/guards"
        import { CreateFinancialTransactionDTO } from "../dtos"
        import { PaymentService } from "../services"
        import { OrangeMoneyUpdateFinancialTransactionStatus } from "../dtos/orange-money-update-financial-transaction.dto";
        import { MtnMoneyUpdateFinancialTransactionStatus } from "../dtos/mtn-money-update-financial-transaction.dto";
        import { Public } from "nest-keycloak-connect";
        import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
        import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
        import { FinancialTransactionState } from "../enum";
        import { FinancialTransactionService } from "../services/financial-transaction.service";
        import { FinancialPaymentService } from "src/financial-payment/services";
        import { PaymentStrategyType } from "src/financial-payment/enum";
        import { LogTransaction } from '../../logs/interceptors/transaction-logger.interceptor';

        
        @Public()
        @Controller("payment")
        @ApiTags("Payment")
        @UseInterceptors(TransformResponeInterceptor)
        export class PaymentController {
            constructor(
                private paymentService: PaymentService,
                private financialTransactionService: FinancialTransactionService,
                private financialPaymentService: FinancialPaymentService
            ) {}

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
                            "fullName": "ulrich Waba",
                            "account": "659396163"
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

     //@UseGuards(AppAuthJwtGuard)
        @Post("pay")
        @Public()
        @ApiOperation({
            summary: "Initiate a new transaction payment",
            description: "Create and initiate a new payment transaction"
        })
        @ApiResponse({status: HttpStatus.OK, description: "Payment initiated successfully"})
        @ApiBody({ type: CreateFinancialTransactionDTO })
        @LogTransaction()
        async makePayment(@Req() request:Request, @Body() createFinancialTransactionDTO:CreateFinancialTransactionDTO)
    {
        return await this.paymentService.makePayment(createFinancialTransactionDTO);
    }


            @Post("orange-money-notify-payment")
            @Public()
            @ApiOperation({
                summary: "Orange Money payment notification",
                description: "Endpoint for Orange Money to notify about payment status changes"
            })
            @ApiResponse({status: HttpStatus.OK, description: "Notification processed successfully"})
            @ApiBody({ type: OrangeMoneyUpdateFinancialTransactionStatus })
            async orangeMoneyNotifyPayment(@Req() request:Request, @Body() orangeMoneyUpdateFinancialTransactionStatus: OrangeMoneyUpdateFinancialTransactionStatus)
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
                            "fullName": "Ulrich Waba",
                            "account": "659396163"
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
            @Post("mtn-money-notify-payment")    
            @Public()
            @ApiOperation({
                summary: "MTN Money payment notification",
                description: "Endpoint for MTN Money to notify about payment status changes"
            })
            @ApiResponse({status: HttpStatus.OK, description: "Notification processed successfully"})
            async mtnMoneyNotifyPayment(@Req() request:Request, @Body() mtnMoneyUpdateStatus) {
                return await this.paymentService.updateMtnPaymentStatus(mtnMoneyUpdateStatus.referenceId, mtnMoneyUpdateStatus.status);
            }


            @Get("check/:ref")
            @Public() 
            @ApiOperation({
                summary: "Get payment-transaction status",
                description: "Check the status of a payment transaction using its reference"
            })
            @ApiParam({ name: 'ref', description: 'Transaction reference' })
            @ApiResponse({status: HttpStatus.OK, description: "Transaction status retrieved successfully"})
            async checkPayment(@Req() request:Request, @Param("ref") ref:string)
            {
                return await this.paymentService.checkPayment(ref)  
            }

            @Get("check-mtn-payment/:referenceId")
            @Public()
            @ApiOperation({
                summary: "Check MTN Money payment status",
                description: "Check the status of an MTN Money payment by reference ID"
            })
            @ApiParam({ name: 'referenceId', description: 'Reference ID of the transaction' })
            @ApiResponse({status: HttpStatus.OK, description: "Payment status retrieved successfully"})
            @ApiResponse({status: HttpStatus.NOT_FOUND, description: "Transaction not found"})
            async checkMtnPaymentStatus(@Param('referenceId') referenceId: string) {
                const transaction = await this.financialTransactionService.findOneByField({ ref: referenceId });
                
                if (!transaction) {
                    throw new NotFoundException(`Transaction with reference ${referenceId} not found`);
                }
                
                // Si la transaction est en attente, vérifier le statut auprès de MTN
                if (transaction.state === FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING) {
                    const paymentBuilder = this.financialPaymentService.getPaymentBuilder();
                    const mtnStrategy = paymentBuilder.getMethodPayment(PaymentStrategyType.MTN_MONEY);
                    
                    try {
                        const checkResult = await mtnStrategy.check(transaction);
                        
                        // Mettre à jour la transaction si nécessaire
                        if (checkResult.status === 'SUCCESSFUL') {
                            transaction.state = FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS;
                            transaction.endDate = new Date().toISOString();
                            await this.financialTransactionService.update(transaction._id, transaction);
                        } else if (checkResult.status === 'FAILED') {
                            transaction.state = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                            transaction.endDate = new Date().toISOString();
                            await this.financialTransactionService.update(transaction._id, transaction);
                        }
                    } catch (error) {
                        console.error('Erreur de vérification du statut de paiement MTN:', error);
                    }
                }
                
                return transaction;
            }
        }
