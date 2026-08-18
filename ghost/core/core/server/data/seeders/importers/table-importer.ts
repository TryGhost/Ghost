import debugFactory from '@tryghost/debug';
// @ts-expect-error This module lacks type definitions.
import dateToDatabaseString from '../utils/database-date';
import path from 'node:path';
import fs from 'node:fs';
import papaparse from 'papaparse';
import {luck} from '../utils/random';
import os from 'node:os';
import crypto from 'node:crypto';
import logging from '@tryghost/logging';
import errors from '@tryghost/errors';
import type {Knex} from 'knex';
import type {Promisable} from 'type-fest';

type GeneratedModel = Record<string, unknown>;

const debug = debugFactory('TableImporter');

export abstract class TableImporter<
    T extends GeneratedModel = GeneratedModel,
    TReferenced extends GeneratedModel = GeneratedModel
> {
    protected name: string;
    protected knex: Knex;
    protected transaction: Knex.Transaction;
    /** Referenced model when generating data. */
    protected model?: TReferenced;
    /** Default number of records to import. */
    protected defaultQuantity?: number;

    /** Transaction and knex stay separate because batchInsert needs both. */
    constructor(name: string, knex: Knex, transaction: Knex.Transaction) {
        this.name = name;
        this.knex = knex;
        this.transaction = transaction;
    }

    fastFakeObjectId() {
        // It is important that IDs are generated for a timestamp < NOW (for email batch sending) and that
        // generating the ids is fast.
        return `00000000` + crypto.randomBytes(8).toString('hex');
    }

    async #generateData(amount = this.defaultQuantity ?? 0): Promise<T[]> {
        const data: T[] = [];

        for (let i = 0; i < amount; i++) {
            const model = await this.generate();
            if (model) {
                data.push(model);
            }
        }

        return data;
    }

    async import(amount = this.defaultQuantity): Promise<void> {
        const generateNow = Date.now();
        const data = await this.#generateData(amount);
        debug(`${this.name} generated ${data.length} records in ${Date.now() - generateNow}ms`);

        if (data.length > 0) {
            await this.batchInsert(data);
        }
    }

    async importForEach(models: TReferenced[] = [], amount: number | (() => number) = 0): Promise<void> {
        const data: T[] = [];

        debug (`Generating data for ${models.length} models x ${amount} for ${this.name}`);
        const now = Date.now();
        let settingReferenceModel = 0;

        for (const model of models) {
            const s = Date.now();
            this.setReferencedModel(model);
            settingReferenceModel += Date.now() - s;

            let currentAmount = (typeof amount === 'function') ? amount() : amount;
            if (!Number.isInteger(currentAmount)) {
                currentAmount = Math.floor(currentAmount) + Number(luck((currentAmount % 1) * 100));
            }

            const generatedData = await this.#generateData(currentAmount);
            for (const generatedModel of generatedData) {
                data.push(generatedModel);
            }
        }

        debug(`${this.name} generated ${data.length} records in ${Date.now() - now}ms (${settingReferenceModel}ms setting reference model)`);

        if (data.length > 0) {
            await this.batchInsert(data);
        }
    }

    async batchInsert(data: T[]): Promise<void> {
        // Write to CSV file
        const rootFolder = os.tmpdir();
        const filePath = path.join(rootFolder, `${this.name}.csv`);
        let now = Date.now();

        if (data.length > 5000 && !process.env.DISABLE_FAST_IMPORT) {
            try {
                await fs.promises.unlink(filePath);
            } catch (e) {
                // Ignore: file doesn't exist
            }

            const columns = Object.keys(data[0]);

            // Loop the data in chunks of 50.000 items
            const batchSize = 50000;

            // Otherwise we get a out of range error because csvWriter tries to create a string that is too long
            for (let i = 0; i < data.length; i += batchSize) {
                const slicedData = data.slice(i, i + batchSize);

                // Map data to what MySQL expects in the CSV for values like booleans, null and dates
                for (const obj of slicedData) {
                    const mutableObj: GeneratedModel = obj;

                    for (const [key, value] of Object.entries(mutableObj)) {
                        if (typeof value === 'boolean') {
                            mutableObj[key] = value ? 1 : 0;
                        } else if (value instanceof Date) {
                            mutableObj[key] = dateToDatabaseString(value);
                        } else if (value === null) {
                            mutableObj[key] = '\\N';
                        }
                    }
                }
                const csv = papaparse.unparse(slicedData, {
                    columns,
                    header: i === 0,
                    newline: '\n'
                });
                await fs.promises.appendFile(filePath, `${i === 0 ? '' : '\n'}${csv}`);
            }

            debug(`${this.name} saved CSV import file in ${Date.now() - now}ms`);
            now = Date.now();

            // Import from CSV file
            const [result] = await this.transaction.raw(`LOAD DATA LOCAL INFILE '${filePath}' INTO TABLE \`${this.name}\` FIELDS TERMINATED BY ',' ENCLOSED BY '"' IGNORE 1 LINES (${Object.keys(data[0]).map(d => '`' + d + '`').join(',')});`);
            if (result.affectedRows !== data.length) {
                if (Math.abs(result.affectedRows - data.length) > 0.01 * data.length) {
                    throw new errors.InternalServerError({
                        message: `CSV import failed: expected ${data.length} imported rows, got ${result.affectedRows}`
                    });
                }
                logging.warn(`CSV import warning: expected ${data.length} imported rows, got ${result.affectedRows}.`);
            }
        } else {
            await this.knex.batchInsert(this.name, data as GeneratedModel[]).transacting(this.transaction);
        }

        debug(`${this.name} imported ${data.length} records in ${Date.now() - now}ms`);
    }

    /**
     * Finalise the imported data, e.g. adding summary records based on a table's dependents
     */
    async finalise(): Promise<void> {
        // No-op by default
    }

    /**
     * Sets the model which newly generated data will reference
     */
    setReferencedModel(model: TReferenced): void {
        this.model = model;
    }

    /**
     * Generates the data for a single model to be imported
     */
    generate(): Promisable<T | void | undefined | null> {
        // Should never be called
    }
}
