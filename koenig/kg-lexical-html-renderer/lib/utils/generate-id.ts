import type {RendererOptions} from '@tryghost/kg-default-nodes';
import {slugify} from '@tryghost/kg-utils';

function generateId(text: string, options: RendererOptions) {
    /* c8 ignore next 3 */
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
