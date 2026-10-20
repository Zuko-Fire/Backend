import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';

@Injectable()
export class BodyValidationPipe implements PipeTransform<any> {
  private validationPipe = new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: false,
    transform: false,
    skipMissingProperties: true,
    stopAtFirstError: false,
    disableErrorMessages: true,
  });

  transform(value: any, metadata: ArgumentMetadata) {
    // Only validate body DTOs, skip query/param/user
    if (metadata.type !== 'body') {
      return value;
    }
    return this.validationPipe.transform(value, metadata);
  }
}
