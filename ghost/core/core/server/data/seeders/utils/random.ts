import {faker} from '@faker-js/faker';
import {fromDatabaseDate, type DatabaseDate} from '../../../lib/db-date';

/**
 * Adds another degree of randomness into some decisions
 * @param lowerThan Only this % of people will achieve this luck
 * @returns Whether this person is lucky enough for the condition
 */
export const luck = (lowerThan: number): boolean => faker.number.int({
    min: 1,
    max: 100
}) <= lowerThan;

export function randomDateBetween(start: DatabaseDate, end: DatabaseDate): Date {
    const earliest = fromDatabaseDate(start);
    const latest = fromDatabaseDate(end);

    return latest > earliest ? faker.date.between({from: earliest, to: latest}) : earliest;
}
