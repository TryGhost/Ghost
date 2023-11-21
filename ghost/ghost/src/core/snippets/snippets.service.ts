import {Injectable, Inject} from '@nestjs/common';
import {Snippet} from './snippet.entity';
import {ISnippetsRepository} from './snippets.repository.interface';

@Injectable()
export class SnippetsService {
    constructor(
        @Inject('SnippetsRepository') private readonly repository: ISnippetsRepository
    ) {}

    async browse(options: {debug?: boolean, filter?: string}): Promise<Snippet[]> {
        return this.repository.findAll(options);
    }
}
