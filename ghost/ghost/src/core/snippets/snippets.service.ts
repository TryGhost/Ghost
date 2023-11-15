import {Injectable, Inject} from '@nestjs/common';
import {Snippet} from './Snippet';
import {ISnippetsRepository} from './snippets.repository.interface';

@Injectable()
export class SnippetsService {
    constructor(
        @Inject('SnippetsRepository') private readonly repository: ISnippetsRepository
    ) {}

    async browse(): Promise<Snippet[]> {
        console.log('getting snippets from NEST!');
        return this.repository.findAll({});
    }
}
