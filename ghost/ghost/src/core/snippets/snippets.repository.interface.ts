import {Snippet} from './Snippet';

export interface ISnippetsRepository {
  findAll(options: {debug?: boolean}): Promise<Snippet[]>;
}
