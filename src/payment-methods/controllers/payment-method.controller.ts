import { Body, Controller, Delete, Get, Param, Post, Put, Req, UseInterceptors } from "@nestjs/common";
import { PaymentMethodService } from "../services/payment-method.service";
import { UpdatePaymentMethodTableDTO } from "../dtos/update-payment-method-table.dto";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { CreatePaymentMethodDTO } from "../dtos/create-payment-method.dto";
import { TransformResponeInterceptor } from "src/shared/interceptors/transform-response.interceptor";
import { CustomMessage } from "src/shared/decorators/custom-message.decorator";
import { UpdatePaymentMethodDTO } from "../dtos/update-payment-method.dto";
import { Request } from "express";

@Controller('payment-method')
@UseInterceptors(TransformResponeInterceptor)
export class PaymentMethodController {

    constructor(
        private paymentMethodService: PaymentMethodService,
    ){}

    @Post()
    @CustomMessage('Payment method successfully created')
    async createPaymentMethod(@Body() createPaymentMethodDto: CreatePaymentMethodDTO, @Req() req: Request){
        return await this.paymentMethodService.createPaymentMethod(createPaymentMethodDto, req);
    }

    @CustomMessage('Payment methods successfully retrieved')
    @Get()
    async getPaymentMethods() {
        return await this.paymentMethodService.getPaymentMethods();
    }

    @CustomMessage('Payment method(s) successfully added to the specified application')
    @Put('app-add/:id')
    async addPaymentMethods(@Body() updatePaymentMethodsTableDto: UpdatePaymentMethodTableDTO, @Param("id", ObjectIDValidationPipe) id: string) {
        return await this.paymentMethodService.addPaymentMethods(updatePaymentMethodsTableDto, id);
    }

    @CustomMessage('Payment method status successfully updated')
    @Put(':id')
    async updatePaymentMethod(@Body() updatePaymentMethodDto: UpdatePaymentMethodDTO, @Param("id", ObjectIDValidationPipe) id: string, @Req() req: Request) {
        return await this.paymentMethodService.updatePaymentMethod(updatePaymentMethodDto, id, req);
    }

    @CustomMessage('Payment method(s) successfully deleted for the specified application')
    @Put('app-remove/:id')
    async deletePaymentMethods(@Body() updatePaymentMethodsTableDto: UpdatePaymentMethodTableDTO, @Param("id", ObjectIDValidationPipe) id: string) {
        return await this.paymentMethodService.deletePaymentMethods(updatePaymentMethodsTableDto, id);
    }

}