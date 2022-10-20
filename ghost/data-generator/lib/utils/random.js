const {faker} = require('@faker-js/faker');

/**
 * Adds another degree of randomness into some decisions
 * @param {number} betterThan Only this % of people will achieve this luck
 * @returns {boolean} Whether this person is lucky enough for the condition
 */
const luck = betterThan => faker.datatype.number({
    min: 1,
    max: 100
}) <= betterThan;

module.exports = {
    luck
};
