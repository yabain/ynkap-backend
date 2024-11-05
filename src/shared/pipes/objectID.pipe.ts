import { ArgumentMetadata, BadRequestException, HttpStatus, Injectable, PipeTransform } from "@nestjs/common";
import { Types } from 'mongoose';

const { ObjectId } = Types;

@Injectable()
export class ObjectIDValidationPipe implements PipeTransform {
    transform(value: string, metadata: ArgumentMetadata): Types.ObjectId {
        if(ObjectId.isValid(value))
            return new Types.ObjectId(value);
        else {
            throw new BadRequestException({
                statusCode: HttpStatus.BAD_REQUEST,
                message: "INVALID ID"
            })
        }
    }
}