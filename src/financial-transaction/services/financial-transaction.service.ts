import { HttpStatus, Injectable, NotFoundException } from "@nestjs/common"
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import mongoose, { Model } from "mongoose";
import { ApplicationService } from "src/application/services";
import { WalletService } from "src/wallet/services";
import { CreateFinancialTransactionDTO } from "../dtos";
import { FinancialTransaction, FinancialTransactionDocument } from "../models";
import { ConfigService } from "@nestjs/config";
import { DataBaseService } from "src/shared/database";

@Injectable()
export class FinancialTransactionService extends DataBaseService<FinancialTransactionDocument>
{
    constructor(
        @InjectModel(FinancialTransaction.name)  private financialTransactionModel:Model<FinancialTransactionDocument>,
        @InjectConnection() connection:mongoose.Connection,
        private applicationService:ApplicationService,
        private walletService:WalletService,
        private configService:ConfigService
    ){
        super(financialTransactionModel,connection,[])
    }

    async createNewFinancialTransaction(createFinancialTransactionDTO:CreateFinancialTransactionDTO,session)
    {

        let apps = await this.applicationService.findOneByField({_id:createFinancialTransactionDTO.appID})
        if(!apps) throw new NotFoundException({
             status:HttpStatus.NOT_FOUND,
             errors:["transaction/app-notfound"],
            message:`APP id ${createFinancialTransactionDTO.appID} not found`
        })
        createFinancialTransactionDTO.application= apps
        createFinancialTransactionDTO.wallet=await this.walletService.findOneByField({application:apps._id});

        return this.create(createFinancialTransactionDTO,session)     
    }

}