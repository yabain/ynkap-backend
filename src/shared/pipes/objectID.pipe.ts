import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import mongoose from 'mongoose';

@Injectable()
export class ObjectIDValidationPipe implements PipeTransform<string, string> {
  transform(value: string, metadata: ArgumentMetadata): string {
    if (!value) {
      throw new BadRequestException(`${metadata.data} is required`);
    }
    
    if (!mongoose.Types.ObjectId.isValid(value)) {
      throw new BadRequestException(`${metadata.data} must be a valid MongoDB ObjectID`);
    }
    return value;
  }
}
