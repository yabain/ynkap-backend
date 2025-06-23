import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FinancialTransaction } from "src/financial-transaction/models";
import { FinancialTransactionErrorType, FinancialTransactionState } from "src/financial-transaction/enum";
import { PaymentMethodStrategy } from "../../interfaces/payment-method.interface";
import { ERROR_CODE } from "src/shared/config/errors";
import { UtilStrategyFunc } from "../utils/util-strategy.func";
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class MtnMoneyStrategyPayment implements PaymentMethodStrategy {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {}

    // Méthode pour obtenir un token d'accès
    private getToken(uuid: string): Promise<string> {
        return new Promise((resolve, reject) => {
            console.log("Getting MTN token with UUID:", uuid);
            
            this.httpService.request({
                url: `${this.configService.get<string>("MOMO_API_PATH")}/collection/token/`,
                method: "post",
                headers: {
                    "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                    "Authorization": `Basic ${Buffer.from(`${uuid}:${this.configService.get<string>("MOMO_API_KEY")}`).toString('base64')}`,
                },
                data: {}
            })
            .subscribe({
                next: (response) => {
                    console.log("MTN token obtained successfully");
                    resolve(response.data.access_token);
                },
                error: (error) => {
                    console.error("MTN token error:", error?.response?.data || error.message);
                    reject(error);
                }
            });
        });
    }

    // Méthode pour créer un utilisateur API (nécessaire uniquement lors de la première configuration)
    createApiUser(): Promise<any> {
        return new Promise((resolve, reject) => {
            const uuid = uuidv4();
            console.log("Creating MTN API User with UUID:", uuid);
            
            this.httpService.request({
                url: `${this.configService.get<string>("MOMO_API_PATH")}/v1_0/apiuser`,
                method: "post",
                headers: {
                    "X-Reference-Id": uuid,
                    "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                    "Content-Type": "application/json"
                },
                data: {
                    providerCallbackHost: this.configService.get<string>("MOMO_API_CALLBACK_HOST") || "https://example.com"
                }
            })
            .subscribe({
                next: async () => {
                    // Créer la clé API pour cet utilisateur
                    try {
                        const apiKeyResponse = await this.httpService.request({
                            url: `${this.configService.get<string>("MOMO_API_PATH")}/v1_0/apiuser/${uuid}/apikey`,
                            method: "post",
                            headers: {
                                "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY")
                            }
                        }).toPromise();
                        
                        const apiKey = apiKeyResponse.data.apiKey;
                        
                        resolve({
                            uuid,
                            apiKey,
                            instructions: "Add these to your .env file as MOMO_API_DEFAULT_UUID and MOMO_API_KEY"
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                error: (error) => {
                    reject(error);
                }
            });
        });
    }

    // Méthode d'achat/paiement
    buy(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Starting MTN payment for transaction:", financialTransaction.ref);
            
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((token) => {
                const paymentRef = financialTransaction.ref || uuidv4();
                
                this.httpService.request({
                    url: `${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttopay`,
                    method: "post",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-Reference-Id": paymentRef,
                        "X-Target-Environment": this.configService.get<string>("MOMO_API_MODE_ENV"),
                        "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "Content-Type": "application/json"
                    },
                    data: {
                        amount: financialTransaction.amount.toString(),
                        currency: "XAF",
                        externalId: financialTransaction._id.toString(),
                        payer: {
                            partyIdType: "MSISDN",
                            partyId: financialTransaction.phoneNumber
                        },
                        payerMessage: "Paiement via Y-Nkap",
                        payeeNote: `Paiement pour ${financialTransaction.description || 'service'}`
                    }
                })
                .subscribe({
                    next: (response) => {
                        console.log("MTN payment initiated successfully");
                        resolve({ 
                            error: FinancialTransactionErrorType.NO_ERROR,
                            ref: paymentRef
                        });
                    },
                    error: (error) => {
                        console.error("MTN payment error:", error?.response?.data || error.message);
                        
                        // Gestion des erreurs spécifiques
                        if (error?.response?.status === 400) {
                            if (error.response.data?.message?.includes("PAYER_NOT_FOUND")) {
                                return resolve({ error: FinancialTransactionErrorType.INVALID_PHONE_NUMBER });
                            }
                            if (error.response.data?.message?.includes("INSUFFICIENT_FUNDS")) {
                                return resolve({ error: FinancialTransactionErrorType.INSUFFICIENT_AMOUNT_ERROR });
                            }
                        }
                        
                        resolve({ error: FinancialTransactionErrorType.UNKNOW_ERROR });
                    }
                });
            })
            .catch((error) => {
                console.error("MTN token error:", error);
                reject(error);
            });
        });
    }

    // Méthode pour vérifier le statut d'une transaction
    check(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Checking MTN payment status for:", financialTransaction.ref);
            
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((token) => {
                this.httpService.request({
                    url: `${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttopay/${financialTransaction.ref}`,
                    method: "get",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "X-Target-Environment": this.configService.get<string>("MOMO_API_MODE_ENV"),
                    }
                })
                .subscribe({
                    next: (response) => {
                        console.log("MTN payment status:", response.data.status);
                        resolve({ 
                            status: response.data.status,
                            ...UtilStrategyFunc.getResponseStatus(response.data) 
                        });
                    },
                    error: (error) => {
                        console.error("MTN check error:", error?.response?.status, error?.response?.data);
                        
                        if (error?.response?.status === 404) {
                            reject(ERROR_CODE.RESSOURCE_NOT_FOUND_ERROR);
                        } else {
                            reject(ERROR_CODE.UNKNOW_ERROR);
                        }
                    }
                });
            })
            .catch((error) => {
                console.error("MTN token error:", error);
                reject(ERROR_CODE.AUTHENTICATION_ERROR);
            });
        });
    }

    // Méthode pour les retraits
    withdrawal(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Starting MTN withdrawal for transaction:", financialTransaction.ref);
            
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((token) => {
                const withdrawalRef = financialTransaction.ref || uuidv4();
                
                this.httpService.request({
                    url: `${this.configService.get<string>("MOMO_API_PATH")}/disbursement/v1_0/transfer`,
                    method: "post",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "X-Reference-Id": withdrawalRef,
                        "X-Target-Environment": this.configService.get<string>("MOMO_API_MODE_ENV"),
                        "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "Content-Type": "application/json"
                    },
                    data: {
                        amount: financialTransaction.amount.toString(),
                        currency: "XAF",
                        externalId: financialTransaction._id.toString(),
                        payee: {
                            partyIdType: "MSISDN",
                            partyId: financialTransaction.phoneNumber
                        },
                        payerMessage: "Retrait via Y-Nkap",
                        payeeNote: `Retrait pour ${financialTransaction.description || 'service'}`
                    }
                })
                .subscribe({
                    next: (response) => {
                        console.log("MTN withdrawal initiated successfully");
                        resolve({ 
                            error: FinancialTransactionErrorType.NO_ERROR,
                            ref: withdrawalRef
                        });
                    },
                    error: (error) => {
                        console.error("MTN withdrawal error:", error?.response?.data || error.message);
                        
                        // Gestion des erreurs spécifiques
                        if (error?.response?.status === 400) {
                            if (error.response.data?.message?.includes("PAYEE_NOT_FOUND")) {
                                return resolve({ error: FinancialTransactionErrorType.RECEIVER_NOT_FOUND_ERROR });
                            }
                            if (error.response.data?.message?.includes("INSUFFICIENT_FUNDS")) {
                                return resolve({ error: FinancialTransactionErrorType.INSUFFICIENT_AMOUNT_ERROR });
                            }
                        }
                        
                        resolve({ error: FinancialTransactionErrorType.UNKNOW_ERROR });
                    }
                });
            })
            .catch((error) => {
                console.error("MTN token error:", error);
                reject(error);
            });
        });
    }

    // Méthode pour vérifier le statut d'un retrait
    checkWithdrawal(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Checking MTN withdrawal status for:", financialTransaction.ref);
            
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((token) => {
                this.httpService.request({
                    url: `${this.configService.get<string>("MOMO_API_PATH")}/disbursement/v1_0/transfer/${financialTransaction.ref}`,
                    method: "get",
                    headers: {
                        "Authorization": `Bearer ${token}`,
                        "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "X-Target-Environment": this.configService.get<string>("MOMO_API_MODE_ENV"),
                    }
                })
                .subscribe({
                    next: (response) => {
                        console.log("MTN withdrawal status:", response.data.status);
                        resolve({ 
                            status: response.data.status,
                            ...UtilStrategyFunc.getResponseStatus(response.data) 
                        });
                    },
                    error: (error) => {
                        console.error("MTN withdrawal check error:", error?.response?.status, error?.response?.data);
                        
                        if (error?.response?.status === 404) {
                            reject(ERROR_CODE.RESSOURCE_NOT_FOUND_ERROR);
                        } else {
                            reject(ERROR_CODE.UNKNOW_ERROR);
                        }
                    }
                });
            })
            .catch((error) => {
                console.error("MTN token error:", error);
                reject(ERROR_CODE.AUTHENTICATION_ERROR);
            });
        });
    }

    // Méthode pour les annulations
    cancel(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Attempting to cancel MTN transaction:", financialTransaction.ref);
            
            // Note: MTN MoMo API ne supporte pas directement l'annulation des transactions
            // Cette méthode est une implémentation simulée
            
            if (financialTransaction.state === FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS) {
                reject("Cannot cancel a successful transaction");
                return;
            }
            
            // Simuler une annulation en mettant à jour l'état de la transaction
            resolve({ 
                error: FinancialTransactionErrorType.NO_ERROR,
                message: "Transaction marked as cancelled. Note: This is a simulated cancellation as MTN API does not support direct cancellation."
            });
        });
    }
}
