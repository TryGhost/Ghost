import {faker} from '@faker-js/faker';

/**
 * Adds another degree of randomness into some decisions
 * @param lowerThan Only this % of people will achieve this luck
 * @returns Whether this person is lucky enough for the condition
 */
export const luck = (lowerThan: number): boolean => faker.number.int({
    min: 1,
    max: 100
}) <= lowerThan;
