import { ConflictException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectConnection, InjectModel } from "@nestjs/mongoose";
import { DataBaseService } from "src/shared/database/database.service";
import { PaymentMethod, PaymentMethodDocument } from "../models/payment-method.model";
import { Connection, Model } from "mongoose";
import { ApplicationService } from "src/application/services/application.services";
import { Application } from "src/application/models/application.schema";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class PaymentMethodService extends DataBaseService<PaymentMethodDocument>{
    
    constructor(
        @InjectModel(PaymentMethod.name) private paymentMethodModel: Model<PaymentMethodDocument>,
        @InjectConnection() connection: Connection,
        private applicationService: ApplicationService,
        private configService: ConfigService
    ){
        super(paymentMethodModel, connection)
    }

    async createPaymentMethod(createPaymentMethodDto, req): Promise<PaymentMethod> {
        const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
        if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
            throw new ForbiddenException("This feature is only available to administrators");
        }
           

        return this.executeWithTransaction(async (session) => {
            const newPaymentMethod = this.createInstance(createPaymentMethodDto);
            await newPaymentMethod.save({session});
            return newPaymentMethod;
        }).catch((error => {
            console.log(error.message)
            if (error.code == 11000)
                throw new ConflictException(`le moyen de paiement avec le champ ${Object.keys(error.keyPattern)[0]} existe déjà et doit être unique`)
            throw error;
        }))
    }

    async getPaymentMethods(): Promise<PaymentMethod[]> {
        return await this.findAll() 
    }

    async addPaymentMethods(updatePaymentMethodsTableDto, id): Promise<Application> {
        return this.executeWithTransaction(async (session) => {
           
            let application = await this.applicationService.findOneByField({_id: id});
            if(!application) throw new NotFoundException(`the application with the id '${id}' cannot be found`)

            //On se rassure que les moyens de paiements que l'utilisateur souhaite ajoutés existe effectivement dans la base de données
            let paymentMethods = await this.findByField({_id: {$in: updatePaymentMethodsTableDto.paymentMethods} });
            if(paymentMethods.length !== updatePaymentMethodsTableDto.paymentMethods.length)
                throw new NotFoundException('Some of the payment method passed cannot be founded');

            // Ici on effectue une modification de l'application directement en modifiant le champ paymentMethods qui se trouve être un tableau, sans y ajouter des doublons
            return await this.applicationService.update({_id: id}, {$addToSet : {paymentMethods: { $each: paymentMethods}}}, session);
        }).catch((error => {
            console.log(error.message)
            throw error;
        }))
        
    }

    async updatePaymentMethod(updatePaymentMethodDto, id, req): Promise<PaymentMethod> {
        const clientId = this.configService.get<string>('KEYCLOAK_SERVER_CLIENTID');
        if (!req['user']['resource_access'][clientId]?.roles.includes('admin')) {
            throw new ForbiddenException("This feature is only available to administrators");
        }
        
        return this.executeWithTransaction( async (session) => {
            const updatedPaymentMethod = await this.update({_id: id}, updatePaymentMethodDto, session);
            if(!updatedPaymentMethod)
                throw new NotFoundException(`The payment method with the id ${id} cannot be found`);

            return updatedPaymentMethod;
        }).catch((error => {
            throw error;
        }))
    }

    async deletePaymentMethods(updatePaymentMethodsTableDto, id) {

        return this.executeWithTransaction( async (session) => {
            let application = await this.applicationService.findOneByField({_id: id});
            if(!application) throw new NotFoundException(`the application with the id ${id} cannot be found`);

            let paymentMethods = await this.findByField({_id: {$in: updatePaymentMethodsTableDto.paymentMethods} });
            if(paymentMethods.length !== updatePaymentMethodsTableDto.paymentMethods.length)
                throw new NotFoundException('Some of the payment method passed cannot be founded');

            await this.applicationService.update(
                {_id: application._id},
                {$pull: {paymentMethods: {$in: updatePaymentMethodsTableDto.paymentMethods} }},
                session
            );
        }).catch((error => {
            throw error;
        }))
    }
}