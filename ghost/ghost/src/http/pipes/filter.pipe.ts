import {PipeTransform, Injectable} from '@nestjs/common';

@Injectable()
export class ParseFilterQueryPipe implements PipeTransform {
    // @NOTE: the return type here should ideally be a typed NQL object (ask Egg why!)
    transform(value: unknown): string {
        // @NOTE: there should be actual logic here, this is just a skeleton to gouge the amount of syntax
        return value as string;
    }
}
