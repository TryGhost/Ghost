import moment from 'moment';
import * as errors from '@tryghost/errors';
import {z} from 'zod';

export const DATABASE_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export type DatabaseDate = Date | string | number;

// Raw Knex queries need this UTC datetime format for consistent MySQL and SQLite behavior.
export const toDatabaseDate = (date: Date | string): string => moment.utc(date).format(DATABASE_DATE_FORMAT);

export const fromDatabaseDate = (date: DatabaseDate): Date => {
    if (date instanceof Date) {
        return new Date(date);
    }

    if (typeof date === 'string') {
        return moment.utc(date).toDate();
    }

    // Defense-in-depth for legacy SQLite rows stored as epoch milliseconds.
    if (typeof date === 'number') {
        return moment.utc(date).toDate();
    }

    const exhaustive: never = date;
    throw new errors.InternalServerError({message: `Unexpected type for database date: ${exhaustive}`});
};

// A zod codec for datetime columns: MySQL returns a Date, SQLite a string/number;
// normalise to a Date on read and pass a Date through on write.
export const DbDate = z.codec(z.union([z.date(), z.string(), z.number()]), z.date(), {
    decode: value => new Date(value),
    encode: date => date
});
