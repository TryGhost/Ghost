/* eslint-disable @typescript-eslint/no-explicit-any */
import {Collection} from './Collection';
import {Knex} from 'knex';

export interface CollectionRepository {
    createTransaction(fn: (transaction: Knex.Transaction) => Promise<any>): Promise<any>
    save(collection: Collection, options?: {transaction: Knex.Transaction}): Promise<void>
    getById(id: string, options?: {transaction: Knex.Transaction}): Promise<Collection | null>
    getBySlug(slug: string, options?: {transaction: Knex.Transaction}): Promise<Collection | null>
    getAll(options?: any): Promise<Collection[]>
}
