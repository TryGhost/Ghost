import {Collection} from './Collection';
export interface CollectionRepository {
    save(collection: Collection): Promise<void>
    getById(id: string): Promise<Collection | null>
    getAll(options: any): Promise<Collection[]>
}
