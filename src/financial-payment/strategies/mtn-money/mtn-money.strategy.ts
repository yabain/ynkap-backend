import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FinancialTransaction } from "src/financial-transaction/models";
import { FinancialTransactionErrorType, FinancialTransactionState } from "src/financial-transaction/enum";
import { PaymentMethodStrategy } from "../../interfaces/payment-method.interface";
import { ERROR_CODE } from "src/shared/config/errors";
import { UtilStrategyFunc } from "../utils/util-strategy.func";
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';

@Injectable()
export class MtnMoneyStrategyPayment implements PaymentMethodStrategy {
    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService
    ) {
        console.log('MTN Money Strategy initialized with:');
        console.log('- Environment:', this.configService.get<string>('NODE_ENV'));
        console.log('- API Path:', this.configService.get<string>('MOMO_API_PATH'));
        console.log('- API Mode:', this.configService.get<string>('MOMO_API_MODE_ENV'));
        console.log('- API UUID:', this.configService.get<string>('MOMO_API_DEFAULT_UUID'));
    }

    // Méthode corrigée pour obtenir le token avec gestion d'environnement
    private getToken(uuid: string): Promise<string> {
        return new Promise((resolve, reject) => {
            console.log("Getting MTN token with UUID:", uuid);
            
            const apiPath = this.configService.get<string>("MOMO_API_PATH");
            const apiKey = this.configService.get<string>("MOMO_API_KEY");
            const primaryKey = this.configService.get<string>("MOMO_API_PRIMARY_KEY");
            const environment = this.configService.get<string>("MOMO_API_MODE_ENV") || "sandbox";
            
            if (!apiPath || !apiKey || !primaryKey || !uuid) {
                console.error("Missing MTN configuration:", {
                    apiPath: !!apiPath,
                    apiKey: !!apiKey,
                    primaryKey: !!primaryKey,
                    uuid: !!uuid
                });
                return reject(new Error("Missing required MTN configuration"));
            }
            
            // Endpoint différent selon l'environnement
            const tokenEndpoint = environment === "production" 
                ? `${apiPath}/collection/token/`
                : `${apiPath}/collection/token/`;
            
            const credentials = Buffer.from(`${uuid}:${apiKey}`).toString("base64");
            
            console.log(`Using MTN ${environment} environment`);
            
            this.httpService.axiosRef.post(
                tokenEndpoint,
                {},
                {
                    headers: {
                        "Authorization": `Basic ${credentials}`,
                        "Ocp-Apim-Subscription-Key": primaryKey,
                        "Content-Type": "application/json"
                    },
                    timeout: 30000
                }
            )
            .then((response) => {
                if (response.data && response.data.access_token) {
                    console.log("MTN token obtained successfully");
                    resolve(response.data.access_token);
                } else {
                    console.error("Invalid token response:", response.data);
                    reject(new Error("Invalid token response"));
                }
            })
            .catch((error) => {
                console.error("MTN token error:", {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                
                // Gestion spécifique des erreurs de production
                if (error.response?.status === 418) {
                    reject(new Error("MTN API not accessible - Check production keys approval"));
                } else if (error.response?.status === 401) {
                    reject(new Error("MTN Authentication failed - Invalid credentials"));
                } else if (error.response?.status === 403) {
                    reject(new Error("MTN Access forbidden - Keys not approved for production"));
                } else {
                    reject(new Error(`MTN API error: ${error.message}`));
                }
            });
        });
    }

    // Méthode pour créer un utilisateur API (nécessaire uniquement lors de la première configuration)
    createApiUser(): Promise<any> {
        return new Promise((resolve, reject) => {
            const uuid = uuidv4();
            console.log("Creating MTN API User with UUID:", uuid);
            
            this.httpService.axiosRef.post(
                `${this.configService.get<string>("MOMO_API_PATH")}/v1_0/apiuser`,
                {
                    providerCallbackHost: this.configService.get<string>("MOMO_API_CALLBACK_HOST") || "https://example.com"
                },
                {
                    headers: {
                        "X-Reference-Id": uuid,
                        "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "Content-Type": "application/json"
                    }
                }
            )
            .then(async () => {
                // Créer la clé API pour cet utilisateur
                try {
                    const apiKeyResponse = await this.httpService.axiosRef.post(
                        `${this.configService.get<string>("MOMO_API_PATH")}/v1_0/apiuser/${uuid}/apikey`,
                        {},
                        {
                            headers: {
                                "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY")
                            }
                        }
                    );
                    
                    const apiKey = apiKeyResponse.data.apiKey;
                    
                    resolve({
                        uuid,
                        apiKey,
                        instructions: "Add these to your .env file as MOMO_API_DEFAULT_UUID and MOMO_API_KEY"
                    });
                } catch (error) {
                    reject(error);
                }
            })
            .catch((error) => {
                reject(error);
            });
        });
    }

    // Amélioration de la journalisation
    private logTransaction(action: string, transaction: FinancialTransaction, result: any) {
        const logData = {
            timestamp: new Date().toISOString(),
            action,
            transactionId: transaction._id.toString(),
            transactionRef: transaction.ref,
            phoneNumber: transaction.phoneNumber,
            amount: transaction.amount,
            result: typeof result === 'object' ? JSON.stringify(result) : result,
            environment: this.configService.get<string>('NODE_ENV')
        };
        
        console.log(`[MTN-${action}]`, JSON.stringify(logData));
        
        // Ici, vous pourriez ajouter une logique pour enregistrer les logs dans MongoDB
        // ou un service de journalisation externe comme Sentry, Datadog, etc.
    }

    // Méthode d'achat/paiement avec validation renforcée
    buy(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Starting MTN payment for transaction:", financialTransaction.ref);
            
            // Validation renforcée
            if (!this.validateTransaction(financialTransaction)) {
                return resolve({ error: FinancialTransactionErrorType.UNKNOW_ERROR });
            }
            
            const phoneNumber = this.formatPhoneNumber(financialTransaction.phoneNumber);
            const currency = this.configService.get<string>("MOMO_API_CURRENCY") || "XAF";
            const environment = this.configService.get<string>("MOMO_API_MODE_ENV") || "sandbox";
            
            console.log(`MTN Payment - Environment: ${environment}, Currency: ${currency}`);
            
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((token) => {
                const paymentRef = financialTransaction.ref || uuidv4();
                
                return this.httpService.axiosRef.post(
                    `${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttopay`,
                    {
                        amount: financialTransaction.amount.toString(),
                        currency: currency,
                        externalId: financialTransaction._id.toString(),
                        payer: {
                            partyIdType: "MSISDN",
                            partyId: phoneNumber
                        },
                        payerMessage: "Paiement via Y-Nkap",
                        payeeNote: `Paiement pour ${financialTransaction.description || 'service'}`
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "X-Reference-Id": paymentRef,
                            "X-Target-Environment": environment,
                            "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                            "Content-Type": "application/json"
                        },
                        timeout: 45000 // Timeout plus long pour la production
                    }
                );
            })
            .then((response) => {
                console.log("MTN payment request successful");
                const result = { 
                    status: 'PENDING', 
                    ref: financialTransaction.ref,
                    error: FinancialTransactionErrorType.NO_ERROR,
                    token: financialTransaction.ref
                };
                this.logTransaction('BUY-SUCCESS', financialTransaction, result);
                resolve(result);
            })
            .catch((error) => {
                console.error("MTN payment error:", {
                    status: error.response?.status,
                    data: error.response?.data,
                    message: error.message
                });
                
                const errorResult = this.handlePaymentError(error);
                this.logTransaction('BUY-ERROR', financialTransaction, {
                    error: errorResult,
                    details: error?.response?.data || error.message
                });
                resolve(errorResult);
            });
        });
    }

    private validateTransaction(transaction: FinancialTransaction): boolean {
        if (!transaction || !transaction._id) {
            console.error("Invalid transaction object");
            return false;
        }
        
        if (!transaction.phoneNumber) {
            console.error("Missing phone number");
            return false;
        }
        
        if (!transaction.amount || transaction.amount <= 0) {
            console.error("Invalid amount:", transaction.amount);
            return false;
        }
        
        return true;
    }

    private handlePaymentError(error: any): { error: FinancialTransactionErrorType } {
        if (error.response?.status === 418) {
            return { error: FinancialTransactionErrorType.UNKNOW_ERROR };
        }
        
        if (error.response?.status === 401 || error.response?.status === 403) {
            return { error: FinancialTransactionErrorType.UNKNOW_ERROR };
        }
        
        if (error.response?.status === 400) {
            const errorData = error.response.data;
            if (errorData?.message?.includes("PAYEE_NOT_FOUND")) {
                return { error: FinancialTransactionErrorType.RECEIVER_NOT_FOUND_ERROR };
            }
            if (errorData?.message?.includes("INSUFFICIENT_FUNDS")) {
                return { error: FinancialTransactionErrorType.INSUFFICIENT_AMOUNT_ERROR };
            }
            if (errorData?.message?.includes("INVALID_CURRENCY")) {
                return { error: FinancialTransactionErrorType.UNKNOW_ERROR };
            }
        }
        
        if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
            return { error: FinancialTransactionErrorType.TIMEOUT_PAYMENT };
        }
        
        return { error: FinancialTransactionErrorType.UNKNOW_ERROR };
    }

    // Méthode pour vérifier le statut d'une transaction
    check(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Checking MTN payment status for:", financialTransaction.ref);
            
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((token) => {
                this.httpService.axiosRef.get(
                    `${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttopay/${financialTransaction.ref}`,
                    {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                            "X-Target-Environment": this.configService.get<string>("MOMO_API_MODE_ENV"),
                        }
                    }
                )
                .then((response) => {
                    console.log("MTN payment status:", response.data.status);
                    resolve({ 
                        status: response.data.status,
                        ...UtilStrategyFunc.getResponseStatus(response.data) 
                    });
                })
                .catch((error) => {
                    console.error("MTN check error:", error?.response?.status, error?.response?.data);
                    
                    if (error?.response?.status === 404) {
                        reject(ERROR_CODE.RESSOURCE_NOT_FOUND_ERROR);
                    } else {
                        reject(ERROR_CODE.UNKNOW_ERROR);
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
                
                // Obtenir la devise à utiliser (EUR pour le sandbox si XAF n'est pas supporté)
                const configCurrency = this.configService.get<string>("MOMO_API_CURRENCY") || "EUR";
                const currency = this.configService.get<string>("MOMO_API_MODE_ENV") === "sandbox" ? "EUR" : configCurrency;
                console.log("Using currency for withdrawal:", currency);
                
                this.httpService.axiosRef.post(
                    `${this.configService.get<string>("MOMO_API_PATH")}/disbursement/v1_0/transfer`,
                    {
                        amount: financialTransaction.amount.toString(),
                        currency: currency,
                        externalId: financialTransaction._id.toString(),
                        payee: {
                            partyIdType: "MSISDN",
                            partyId: financialTransaction.phoneNumber
                        },
                        payerMessage: "Retrait via Y-Nkap",
                        payeeNote: `Retrait pour ${financialTransaction.description || 'service'}`
                    },
                    {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "X-Reference-Id": withdrawalRef,
                            "X-Target-Environment": this.configService.get<string>("MOMO_API_MODE_ENV"),
                            "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                            "Content-Type": "application/json"
                        }
                    }
                )
                .then(() => {
                    console.log("MTN withdrawal initiated successfully");
                    resolve({ 
                        error: FinancialTransactionErrorType.NO_ERROR,
                        ref: withdrawalRef
                    });
                })
                .catch((error) => {
                    console.error("MTN withdrawal error:", error?.response?.data || error.message);
                    
                    // Gestion des erreurs spécifiques
                    if (error?.response?.data?.code === "INVALID_CURRENCY") {
                        console.error("Currency not supported. Try using EUR for sandbox environment.");
                        return resolve({ error: FinancialTransactionErrorType.UNKNOW_ERROR, details: "Currency not supported" });
                    }
                    
                    if (error?.response?.status === 400) {
                        if (error.response.data?.message?.includes("PAYEE_NOT_FOUND")) {
                            return resolve({ error: FinancialTransactionErrorType.RECEIVER_NOT_FOUND_ERROR });
                        }
                        if (error.response.data?.message?.includes("INSUFFICIENT_FUNDS")) {
                            return resolve({ error: FinancialTransactionErrorType.INSUFFICIENT_AMOUNT_ERROR });
                        }
                    }
                    
                    resolve({ error: FinancialTransactionErrorType.UNKNOW_ERROR });
                });
            })
            .catch((error) => {
                console.error("Failed to get MTN token:", error);
                resolve({ error: FinancialTransactionErrorType.UNKNOW_ERROR });
            });
        });
    }

    // Méthode pour vérifier le statut d'un retrait
    checkWithdrawal(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve, reject) => {
            console.log("Checking MTN withdrawal status for:", financialTransaction.ref);
            
            // Vérifier que les variables d'environnement nécessaires sont définies
            const apiPath = this.configService.get<string>("MOMO_API_PATH");
            const apiMode = this.configService.get<string>("MOMO_API_MODE_ENV");
            const primaryKey = this.configService.get<string>("MOMO_API_PRIMARY_KEY");
            
            if (!apiPath || !apiMode || !primaryKey) {
                console.error("Missing environment variables:", {
                    apiPath: !!apiPath,
                    apiMode: !!apiMode,
                    primaryKey: !!primaryKey
                });
                return reject(new Error("Missing required environment variables"));
            }
            
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((token) => {
                console.log("Token obtained for withdrawal check:", !!token);
                
                this.httpService.axiosRef.get(
                    `${apiPath}/disbursement/v1_0/transfer/${financialTransaction.ref}`,
                    {
                        headers: {
                            "Authorization": `Bearer ${token}`,
                            "Ocp-Apim-Subscription-Key": primaryKey,
                            "X-Target-Environment": apiMode,
                        }
                    }
                )
                .then((response) => {
                    console.log("MTN withdrawal status response:", response.data);
                    resolve({ 
                        status: response.data.status,
                        ...UtilStrategyFunc.getResponseStatus(response.data) 
                    });
                })
                .catch((error) => {
                    console.error("MTN withdrawal check error:", 
                        error?.response?.status, 
                        error?.response?.data || error.message
                    );
                    
                    if (error?.response?.status === 404) {
                        reject(new Error("Transaction not found in MTN system"));
                    } else {
                        reject(new Error(error?.response?.data?.message || error.message || "Unknown error"));
                    }
                });
            })
            .catch((error) => {
                console.error("MTN token error:", error);
                reject(new Error("Failed to obtain MTN authentication token"));
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

    // Méthode pour formater le numéro de téléphone
    private formatPhoneNumber(phoneNumber: string): string {
        // Si le numéro ne commence pas par 237, l'ajouter
        if (!phoneNumber.startsWith('237')) {
            return `237${phoneNumber}`;
        }
        return phoneNumber;
    }
}
