import {DecoratorNode} from 'lexical';

export class KoenigDecoratorNode extends DecoratorNode {
    /* c8 ignore start */

    // Transforms URLs contained in the payload to relative paths (`__GHOST_URL__/relative/path/`),
    // so that URLs to be changed without having to update the database
    // (cf. `@tryghost/url-utils` for more information)
    //
    // To be overwritten by subclasses if there is a url, html or markdown type of property in the payload
    static get urlTransformMap() {
        return {};
    }

    createDOM() {
        return document.createElement('div');
    }

    updateDOM() {
        return false;
    }

    // All our cards are top-level blocks
    isInline() {
        return false;
    }

    // To be overwritten in Koenig Lexical
    decorate() {
        return '';
    }

    /* c8 ignore stop */
}

export function $isKoenigCard(node) {
    return node instanceof KoenigDecoratorNode;
}
