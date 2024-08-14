import { Body, ConflictException, Controller, Delete, Get, HttpException, HttpStatus, Param, Post, Put, Req } from "@nestjs/common";
import { ApplicationService } from "../services/application.services";
import { CreateApplicationDto } from "../dtos/create-application.dtos";
import { ObjectIDValidationPipe } from "src/shared/pipes/objectID.pipe";
import { UpdateApplicationDTOS } from "../dtos/update-application.dtos";
import { Types } from "mongoose";


@Controller('applications')
export class ApplicationController {
    constructor(private applicationService: ApplicationService){}

    @Post()
    async createApplication(@Body() createApplicationDto: CreateApplicationDto, @Req() req) {

        let sub = req["user"]["sub"];
        console.log('sub of the connect user: ', sub);
        try {
            await this.applicationService.createApplication(createApplicationDto, sub)
            return {
                statusCode: HttpStatus.CREATED,
                message: "Application successfully created",
            }
        } catch (error) {
            if(error instanceof ConflictException)
                throw new HttpException(error.message, HttpStatus.CONFLICT)
        }
       
    }

    @Get()
    async getAllApplication(){
        try {
            return {
                statusCode: HttpStatus.OK,
                message: "List of applications for the current user: ",
                data: await this.applicationService.getAllApplication()
            }
        } catch (error) {
            if(error.code == 500)
                throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
            else{
                console.log('the error code :', error.code);
            }
        }
    }

    @Get(':id')
    async getApplicationById(@Param("id", ObjectIDValidationPipe) id:any){
        try {
            return {
                statusCode: HttpStatus.OK,
                message: "Application details:",
                data: await this.applicationService.getApplicationById(id)
            }
        } catch (error) {
            if(error.code == 404)
                throw new HttpException(error.message, HttpStatus.NOT_FOUND)
        }

    }

    @Put(':id')
    async updateApplicationById(@Param("id", ObjectIDValidationPipe) id:any, @Body() updateApplicationDtos: UpdateApplicationDTOS){
        try {
            return {
                statusCode: HttpStatus.OK,
                message: "Application updates:",
                data: await this.applicationService.updateApplicationById(id, updateApplicationDtos)
            }
        } catch (error) {
            if(error.code == 404)
                throw new HttpException(error.message, HttpStatus.NOT_FOUND)
            else 
                console.log("error: ", error);
        }

    }

    @Delete(':id')
    async deleteApplicationById(@Param("id", ObjectIDValidationPipe) id:any){
        try {
            await this.applicationService.deleteApplication(id);
            return {
                statusCode: HttpStatus.OK,
                message: "Application successfuly deleted",
            }
        } catch (error) {
            if(error.code == 404)
                throw new HttpException(error.message, HttpStatus.NOT_FOUND)
            else if(error.code == 500)
                throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR)
            else
                console.log("error :", error)
        }
    }
} 
