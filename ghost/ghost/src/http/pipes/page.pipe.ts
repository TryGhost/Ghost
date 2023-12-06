import {PipeTransform, Injectable} from '@nestjs/common';

@Injectable()
export class ParsePageQueryPipe implements PipeTransform {
    transform(value: unknown): number {
        if (value === undefined) {
            // default value
            return 1;
        }

        // @NOTE: missing edge cases here where parsing fails
        const parsedNumber = Number(value);

        return parsedNumber;
    }
}
