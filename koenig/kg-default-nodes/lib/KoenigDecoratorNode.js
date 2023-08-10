/* eslint-disable ghost/filenames/match-exported-class */
/* c8 ignore start */
import {DecoratorNode} from 'lexical';

export class KoenigDecoratorNode extends DecoratorNode {
}

export function $isKoenigCard(node) {
    return node instanceof KoenigDecoratorNode;
}
/* c8 ignore end */
