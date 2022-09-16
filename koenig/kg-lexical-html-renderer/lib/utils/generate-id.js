const {slugify} = require('@tryghost/kg-utils');

function generateId(text, options) {
    if (!options.usedIdAttributes) {
        options.usedIdAttributes = {};
    }

    const id = slugify(text, options);
    let deduplicatedId = id;

    if (options.usedIdAttributes[id] !== undefined) {
        deduplicatedId += `-${options.usedIdAttributes[id]}`;

        options.usedIdAttributes[id] += 1;
    } else {
        options.usedIdAttributes[id] = 1;
    }

    return deduplicatedId;
}

module.exports = generateId;
