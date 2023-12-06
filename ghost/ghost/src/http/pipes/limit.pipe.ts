import {PipeTransform, Injectable} from '@nestjs/common';

@Injectable()
export class ParseLimitQueryPipe implements PipeTransform {
    transform(value: unknown): number | 'all' {
        if (value === 'all') {
            // default value
            return 'all';
        }

        if (value === undefined) {
            return 15;
        }

        const parsedNumber = Number(value);

        return parsedNumber;
    }
}
