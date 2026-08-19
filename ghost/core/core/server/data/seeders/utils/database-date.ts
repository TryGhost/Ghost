import {faker} from '@faker-js/faker';
import {fromDatabaseDate} from '../../../lib/db-date';

export function randomBetween(start: Date | string | number, end: Date | string | number): Date {
    const earliest = fromDatabaseDate(start);
    const latest = fromDatabaseDate(end);

    return latest > earliest ? faker.date.between({from: earliest, to: latest}) : earliest;
}
