import {Snippet} from './snippet.entity';
import {Repository} from '../../common/repository';

export interface SnippetsRepository extends Repository<Snippet, string, []> {

}
