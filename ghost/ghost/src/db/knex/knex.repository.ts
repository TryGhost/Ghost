import {Inject} from '@nestjs/common';
import {Knex} from 'knex';
import ObjectID from 'bson-objectid';
import {OrderOf, Page, Repository} from '../../common/repository';
import assert from 'assert';
import nql from '@tryghost/nql';
import {Entity} from '../../common/entity';

export abstract class BaseKnexRepository<T extends Entity<unknown>, F, O extends OrderOf<Fields>, Fields extends string[]> implements Repository<T, F, Fields> {
    constructor(@Inject('knex') private readonly knex: Knex) {}
    protected abstract readonly table: string;

    protected abstract mapEntityToRow(entity: T): any;
    protected abstract mapRowToEntity(row: any): T | null;

    private safeMapRowToEntity(row: any): T | null {
        try {
            return this.mapRowToEntity(row);
        } catch (err) {
            // TODO: Sentry logging
            return null;
        }
    }

    private mapRowsToEntities(rows: any[]): T[] {
        const entities = rows.reduce((memo: T[], row) => {
            const entity = this.safeMapRowToEntity(row);
            if (!entity) {
                return memo;
            }
            return memo.concat(entity);
        }, []);
        return entities;
    }

    private buildQuery(order: O[], filter?: F) {
        const knexOrder = order.map((obj) => {
            return {
                column: obj.field,
                order: obj.direction
            };
        });
        const query = this.knex(this.table).orderBy(knexOrder);
        if (filter) {
            nql(filter).querySQL(query);
        }
        return query;
    }

    async save(entity: T): Promise<void> {
        const rows = await this.knex(this.table)
            .where('id', entity.id.toHexString())
            .count('id', {as: 'count'});

        assert(rows.length === 1, 'Got multiple rows for count query');
        let exists: boolean;
        if (typeof rows[0].count === 'number') {
            exists = rows[0].count !== 0;
        } else {
            exists = parseInt(rows[0].count) !== 0;
        }

        const row = this.mapEntityToRow(entity);

        if (exists) {
            await this.knex(this.table)
                .update(row)
                .where('id', entity.id.toHexString());
        } else {
            await this.knex(this.table).insert(row);
        }
    }

    async getOne(id: ObjectID): Promise<T | null> {
        const rows = await this.knex(this.table)
            .where('id', id.toHexString())
            .select();
        if (rows.length === 0) {
            return null;
        }
        assert(rows.length === 1, 'Found two rows with the same id');

        return this.safeMapRowToEntity(rows[0]);
    }

    async getAll(
        order: O[],
        filter?: F
    ): Promise<T[]> {
        const query = this.buildQuery(order, filter);
        const rows = await query.select();
        return this.mapRowsToEntities(rows);
    }

    async getSome(
        page: Page,
        order: O[],
        filter?: F
    ): Promise<T[]> {
        const query = this.buildQuery(order, filter);
        query.limit(page.count).offset((page.page - 1) * page.count);
        const rows = await query.select();
        return this.mapRowsToEntities(rows);
    }

    async getCount(filter?: F): Promise<number> {
        const query = this.knex(this.table);
        if (filter) {
            nql(filter).querySQL(query);
        }
        const rows = await query.count('id', {as: 'count'});
        assert(rows.length === 1, 'Got multiple rows for count query');
        const row = rows[0];
        const count = row.count;
        if (typeof count === 'number') {
            return count;
        }
        return parseInt(count, 10);
    }
}
