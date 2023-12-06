import {PipeTransform, Injectable} from '@nestjs/common';

@Injectable()
export class ParseFormatsQueryPipe implements PipeTransform {
    transform(value: unknown): 'mobiledoc' | 'lexical' {
        return (value === 'lexical') ? 'lexical' : 'mobiledoc';
    }
}
