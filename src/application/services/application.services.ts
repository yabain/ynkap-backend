import { BadRequestException, ConflictException, HttpException, HttpStatus, Injectable, NotFoundException } from "@nestjs/common";
import { DataBaseService } from "src/shared/database/database.service";
import { Application, ApplicationDocument } from "../models/application.schema";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { Connection, Model } from "mongoose";
import { v6 as uuidv6, v4 as uuidv4} from 'uuid'
import { WalletServices } from "src/wallet/services/wallet.services";

@Injectable()
export class ApplicationService extends DataBaseService<ApplicationDocument> {
    constructor(
        @InjectModel(Application.name) private applicationModel: Model<ApplicationDocument>,
        @InjectConnection() connection: Connection,
        private walletService: WalletServices
    ){
        super(applicationModel, connection)
    }

    async createApplication(createApplicationDto, req): Promise<ApplicationDocument> {
        return this.executeWithTransaction( async (session) => {
            const newApplication = this.createInstance(
                {...createApplicationDto, 
                    user: req['user']['sub'], 
                    clientIdProd: uuidv6(), 
                    clientIdTest: uuidv4()
                });
            await newApplication.save({session});
            await this.walletService.create({application: newApplication._id}, session)
            return newApplication;
        }).catch((error => {
            if (error.code == 11000)
                throw new ConflictException(`une application avec le champ ${Object.keys(error.keyPattern)[0]} existe déjà`)
            throw error;
        }))
    }

    async getAllApplications(req): Promise<any[]>{
        let applications = await this.findByField({user: req['user']['sub']});
        let walletAmounts = await this.walletService.getAmounts((applications.map((app) => app._id)));

        return applications.map((application) => ({
            ...application.toObject(),
            walletAmount: walletAmounts.get(application._id.toString())
        }));
    }

    async getApplicationById(id,req): Promise<any>{
        const [application, walletAmount] = await Promise.all([
            this.findOneByField({_id: id, user: req['user']['sub']}),
            this.walletService.getAmount(id)
        ]);

        if(!application)
            throw new NotFoundException(`The application with the ID ${id} cannot be found`);

        return {
            ...application.toObject(),
            walletAmount: walletAmount.amount
        }
    }

    async updateApplicationById(id, updateApplicationDtos): Promise<ApplicationDocument>{
       const updatedApplication = await this.update({_id: id}, updateApplicationDtos);
       
       if(!updatedApplication)
        throw new NotFoundException(`The application with the ID ${id} cannot be found`);
       
       return updatedApplication;
    }

    async deleteApplication(id): Promise<any>{
        return this.executeWithTransaction(async (session) => {
            const application = await this.findOneByField({_id: id})
            if(!application) throw new NotFoundException(`The application with the ID ${id} cannot be found`);
            
            let wallet = await this.walletService.findOneByField({application: id});
            if(!wallet) throw new NotFoundException(`The wallet of the application with the ID: ${id} cannot be found `);

            if((wallet.amount == 0)) {
                await this.walletService.delete({application: id}, session);
                await this.delete({_id: id}, session);
            } else {
                throw new BadRequestException(`Veuillez transférer les fonds du portefeuille de ${application.name} avant de poursuivre`)
            }
        })
    }
}