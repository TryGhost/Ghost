import {PipeTransform, BadRequestException} from '@nestjs/common';
import {ZodObject} from 'zod';

export class ZodValidationPipe implements PipeTransform {
    // @NOTE: this is meant to be a generic helper to construct Zod validation pipes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(private schema: ZodObject<any>) {}

    transform(value: unknown) {
        let parsed;
        try {
            parsed = this.schema.parse(value);
        } catch (error) {
            throw new BadRequestException('Validation failed');
        }

        return parsed;
    }
}
