import moment from 'moment';
import * as errors from '@tryghost/errors';

export const DATABASE_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';

export type DatabaseDate = Date | string | number;

export const toDatabaseDate = (date: Date | string): string => moment.utc(date).format(DATABASE_DATE_FORMAT);

export const fromDatabaseDate = (date: DatabaseDate): Date => {
    if (date instanceof Date) {
        return new Date(date);
    }

    if (typeof date === 'string') {
        return moment.utc(date, DATABASE_DATE_FORMAT).toDate();
    }

    // Defense-in-depth for legacy SQLite rows stored as epoch milliseconds.
    if (typeof date === 'number') {
        return moment.utc(date).toDate();
    }

    const exhaustive: never = date;
    throw new errors.InternalServerError({message: `Unexpected type for database date: ${exhaustive}`});
};
