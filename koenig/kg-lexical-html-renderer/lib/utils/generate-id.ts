import {RendererOptions} from '../convert-to-html-string';

// TODO: update to import when converted to typescript, for now disable next line
// eslint-disable-next-line
const {slugify} = require('@tryghost/kg-utils');

function generateId(text: string, options: RendererOptions) {
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

export default generateId;
