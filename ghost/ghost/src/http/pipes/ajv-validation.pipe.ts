import {PipeTransform} from '@nestjs/common';
import {validate} from '@tryghost/admin-api-schema';

export class AJVValidationPipe implements PipeTransform {
    /**
     *
     * @param schema - The schema name to validate against in format `{resourceName}-{action}`
     *                 For example: `snippets-browse`
     */
    constructor(private schema: string) {}

    async transform(value: unknown) {
        await validate({
            data: value,
            schema: this.schema
        });

        return value;
    }
}
