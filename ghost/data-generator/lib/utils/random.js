const {faker} = require('@faker-js/faker');

/**
 * Adds another degree of randomness into some decisions
 * @param {number} lowerThan Only this % of people will achieve this luck
 * @returns {boolean} Whether this person is lucky enough for the condition
 */
const luck = lowerThan => faker.datatype.number({
    min: 1,
    max: 100
}) <= lowerThan;

module.exports = {luck};
