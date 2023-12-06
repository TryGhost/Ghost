import {Snippet} from './snippet.entity';
import {Repository} from '../../common/interfaces/repository.interface';

export interface SnippetsRepository extends Repository<Snippet, string, []> {

}
