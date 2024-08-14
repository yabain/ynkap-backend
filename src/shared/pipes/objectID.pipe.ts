import { ArgumentMetadata, BadRequestException, HttpStatus, Injectable, PipeTransform } from "@nestjs/common";
import mongoose from "mongoose";
var ObjectId = require('mongoose').Types.ObjectId

@Injectable()
export class ObjectIDValidationPipe implements PipeTransform {
    transform(value: any, metadata: ArgumentMetadata) {
        if(ObjectId.isValid(value))
            return new mongoose.Types.ObjectId(value);
        else {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: "INVALID ID"
            })
        }
    }
}