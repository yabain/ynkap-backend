import { ConflictException, Injectable } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Application, ApplicationDocument } from "../models/application.schema";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { Wallet, WalletDocument } from "src/wallet/models/wallet.schema";
import { v6 as uuidv6, v4 as uuidv4} from 'uuid'

@Injectable()
export class ApplicationService extends DataBaseService<ApplicationDocument> {
    constructor(
        @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
        @InjectModel(Wallet.name)  private walletModel: Model<WalletDocument>,
        @InjectConnection() connection: Connection,
    ){
        super(applicationModel, connection)
    }

    async createApplication(createApplicationDto, sub): Promise<any> {

        return await this.executeWithTransaction( async (session) => {
            try {
                const newApplication = this.createInstance(
                    {...createApplicationDto, 
                        user: sub, 
                        clientIdProd: uuidv6(), 
                        clientIdTest: uuidv4()
                    });
                console.log('new App: ', newApplication);
                await newApplication.save({session});
                await this.walletModel.create({application: newApplication._id})
                return newApplication;
            } catch (error) {
                if (error.code == 11000)
                    throw new ConflictException(`une application avec le champ ${Object.keys(error.keyPattern)[0]} existe déjà`)
                console.log('error in the service with message: ', error.message)
            }
        }).then((result) => result)

    }

    async getAllApplication(){
        try {
            return await this.findAll()
        } catch (error) {
            console.log('error in the service with message: ', error.message)
        }
    }

    async getApplicationById(id){
        try {
            return await this.findOneByField({_id: id})
                .then((result) => {
                    if(result) return result.toObject();
                    else return result
                });
        } catch (error) {
            console.log('error in the service with message: ', error.message)
        }
    }

    async updateApplicationById(id, updateApplicationDtos){
        try {
            console.log("id : ",id);
            console.log('Dtos update: ', updateApplicationDtos);
            return await this.update({_id: id}, updateApplicationDtos)
        } catch (error) {
            console.log('error in the service with message: ', error.message)        }
    }

    async deleteApplication(id){
        try {
            await this.executeWithTransaction(async (session) => {
                let wallet = await this.walletModel.findOne({application: id})
                // .then((result) => {
                //     console.log('result findOne:', result);
                //     return result;
                // });
                if(wallet) await this.walletModel.deleteOne({application: id});
                await this.delete({_id: id}, session);
            }).then(() => console.log('deleting app successfully'));
        } catch (error) {
            console.log('error in the service with message: ', error.message)
        }
    }
}