import {Snippet} from './snippet.entity';

export interface ISnippetsRepository {
  findAll(options: {debug?: boolean, filter?: string}): Promise<Snippet[]>;
}
