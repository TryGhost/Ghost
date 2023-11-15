import {Injectable} from '@nestjs/common';
import {Snippet} from '../../core/snippets/Snippet';

@Injectable()
export class SnippetsService {
    // @NOTE: inject repository here using models
    // constructor(@Inject('models') private readonly models) {}

    browse(): Snippet[] {
        return [];
    }
}
