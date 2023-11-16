import {Snippet} from './snippet.entity';

export interface ISnippetsRepository {
  findAll(options: {debug?: boolean}): Promise<Snippet[]>;
}
