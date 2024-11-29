import { HttpService } from "@nestjs/axios";
import { Injectable } from "@nestjs/common"
import { ConfigService } from "@nestjs/config";
import { map } from "rxjs";
import { FinancialTransactionErrorType, FinancialTransactionState } from "src/financial-transaction/enum";
import { FinancialTransaction } from "src/financial-transaction/models";
import { PaymentMethodStrategy } from "src/financial-payment/interfaces";
import { ERROR_CODE } from "src/shared/config/errors";
import { v4 as uuidv4 } from 'uuid';
import { StrategyResponseStatus } from "../strategy-response-status.enum";
import { UtilStrategyFunc } from "../util-strategy-func";


@Injectable()
export class MtnMoneyStrategyPayment implements PaymentMethodStrategy
{
    constructor(private configService:ConfigService,private readonly httpService:HttpService){}
    

    token="";

    getToken(uuid):Promise<string>
    {
        return new Promise((resolve,reject)=>{
            this.httpService.request({
                url:`${this.configService.get<string>("MOMO_API_PATH")}/collection/token/`,
                method:"post",
                headers:{
                    Authorization:`Basic ${Buffer.from(uuid+":"+this.configService.get<string>("MOMO_API_KEY")).toString('base64')}`,
                    "Ocp-Apim-Subscription-Key": this.configService.get<string>("MOMO_API_PRIMARY_KEY")
                }
            })
            .pipe(
                map(response => response.data)
            )
            .subscribe(
                (data)=> resolve(data.access_token),
                (error)=> reject(error)
            )
        })
    }
    
  

    buy(financialTransaction: FinancialTransaction): Promise<any> {
        // console.log("Financial ",financialTransaction)
        return new Promise((resolve,reject)=>{
            let token="";
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((result)=>{
                token = result;
                this.httpService.request({
                    url:`${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttopay`,
                    method:"post",
                    headers:{
                        Authorization: `Bearer ${token}`,
                        "X-Reference-Id":financialTransaction.ref,
                        "Ocp-Apim-Subscription-Key":this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "X-Target-Environment":this.configService.get<string>("MOMO_API_MODE_ENV"),
                    },
                    data:{
                        "amount": `${financialTransaction.amount}`,
                        "currency": financialTransaction.moneyCode,
                        "externalId": financialTransaction.ref,
                        "payer": {
                            "partyIdType": "MSISDN",
                            "partyId": financialTransaction.userRef.account
                        },
                        "payerMessage": `Une transaction de ${financialTransaction.amount} ${financialTransaction.moneyCode} a été fait depuis votre compte`,
                        "payeeNote": `Une transaction de ${financialTransaction.amount} ${financialTransaction.moneyCode} a été fait vers votre compte`
                    }
                })
                .subscribe(
                    (data)=>{
                        console.log("data ",data)
                        resolve({ error:FinancialTransactionErrorType.NO_ERROR })
                    },
                    (error)=>{reject(error)}
                )
            
            })
            .catch((error)=>  reject(error))
        }) 
    }
    check(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve,reject)=>{
            // console.log("Path ",`${this.path}/collection/v1_0/requesttopay/${financialTransaction.ref}`)
            // console.log("Token ",financialTransaction.token)
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((result)=>{
                this.httpService.request({
                    url:`${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttopay/${financialTransaction.ref}`,
                    method:"get",
                    headers:{
                        Authorization: `Bearer ${result}`,
                        "X-Reference-Id":financialTransaction.ref,
                        "Ocp-Apim-Subscription-Key":this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "X-Target-Environment":this.configService.get<string>("MOMO_API_MODE_ENV"),
                    },
                })
                .subscribe(
                    (response)=>{
                        resolve({ ...UtilStrategyFunc.getResponseStatus(response.data) })
                    },
                    (error)=>{
                        let resultCode = null;
                        switch(error.status)
                        {
                            case 400:
                                return resolve({...UtilStrategyFunc.getResponseStatus(error.data)});
                            case 404:
                                resultCode=ERROR_CODE.RESSOURCE_NOT_FOUND_ERROR;
                                break;
                            default:
                                resultCode=ERROR_CODE.UNKNOW_ERROR;
                        }
                        reject(resultCode)
                    }
                )
            })
            .catch((error)=>reject(error))
        });
    }
    cancel(financialTransaction: FinancialTransaction): Promise<any> {
        throw new Error("Method not implemented.");
    }
    
    withdrawal(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve,reject)=>{
            let token="";
            let uuid = uuidv4();
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID")) //
            .then((result)=>{
                token = result;

                this.httpService.request({
                    url:`${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttowithdraw`,
                    method:"post",
                    headers:{
                        Authorization: `Bearer ${token}`,
                        "X-Reference-Id":financialTransaction.ref,
                        "Ocp-Apim-Subscription-Key":this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "X-Target-Environment":this.configService.get<string>("MOMO_API_MODE_ENV"),
                    },
                    data:{
                        "amount": `${financialTransaction.amount}`,
                        "currency": financialTransaction.moneyCode,
                        "externalId": financialTransaction.ref,
                        "payer": {
                            "partyIdType": "MSISDN",
                            "partyId": financialTransaction.userRef.account
                        },
                        "payerMessage": `Une transaction de ${financialTransaction.amount} ${financialTransaction.moneyCode} a été fait depuis votre compte`,
                        "payeeNote": `Une transaction de ${financialTransaction.amount} ${financialTransaction.moneyCode} a été fait vers votre compte`
                    }
                })
                .pipe(
                    map((response)=>response.data)
                )
                .subscribe(
                    (data)=>resolve({ token,error:FinancialTransactionErrorType.NO_ERROR }),
                    (error)=>{
                        reject(error)
                    }
                )
            
            })
            .catch((error)=>  reject(error))
        })
    } 

    checkWithdrawal(financialTransaction: FinancialTransaction): Promise<any> {
        return new Promise((resolve,reject)=>{
            this.getToken(this.configService.get<string>("MOMO_API_DEFAULT_UUID"))
            .then((result)=>{
                this.httpService.request({
                    url:`${this.configService.get<string>("MOMO_API_PATH")}/collection/v1_0/requesttowithdraw/${financialTransaction.ref}`,
                    method:"get",
                    headers:{
                        Authorization: `Bearer ${result}`,
                        "X-Reference-Id":financialTransaction.ref,
                        "Ocp-Apim-Subscription-Key":this.configService.get<string>("MOMO_API_PRIMARY_KEY"),
                        "X-Target-Environment":this.configService.get<string>("MOMO_API_MODE_ENV"),
                    }
                })
                .subscribe(
                    (response)=>{
                    let r = { endDate:new Date().toISOString() };

                    switch(response.data.status)
                    {
                        case StrategyResponseStatus.SUCCESSFUL: 
                            r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS
                            r["error"] = FinancialTransactionErrorType.NO_ERROR
                            break;
                        case StrategyResponseStatus.FAILED:
                            switch(response.data.reason.code)
                            {
                                case StrategyResponseStatus.PAYER_NOT_FOUND:
                                    r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR
                                    r["error"] = FinancialTransactionErrorType.BUYER_NOT_FOUND_ERROR
                                    break;

                                case StrategyResponseStatus.PAYEE_NOT_FOUND:
                                    r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_SUCCESS
                                    r["error"] = FinancialTransactionErrorType.RECEIVER_NOT_FOUND_ERROR
                                    break;
                                default:
                                    r["status"]=FinancialTransactionState.FINANCIAL_TRANSACTION_ERROR;
                                    r["error"] = FinancialTransactionErrorType.UNKNOW_ERROR
                            }
                            break;
                        case StrategyResponseStatus.PENDING:
                            r["status"] = FinancialTransactionState.FINANCIAL_TRANSACTION_PENDING
                            r["error"] = FinancialTransactionErrorType.NO_ERROR
                    }
                    resolve(r)
                    },
                    (error)=>{
                        console.log("Error ",error)
                        reject(error)
                    }
                )           
            })
            .catch((error)=>reject(error))
        })
    }

}