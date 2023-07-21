import {Collection} from './Collection';

export interface CollectionRepository {
    createTransaction(fn: (transaction: any) => Promise<any>): Promise<any>
    save(collection: Collection, options?: {transaction: any}): Promise<void>
    getById(id: string, options?: {transaction: any}): Promise<Collection | null>
    getBySlug(slug: string, options?: {transaction: any}): Promise<Collection | null>
    getAll(options?: any): Promise<Collection[]>
}
