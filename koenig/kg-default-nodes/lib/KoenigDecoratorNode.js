import {DecoratorNode} from 'lexical';

export class KoenigDecoratorNode extends DecoratorNode {}

export function $isKoenigCard(node) {
    return node instanceof KoenigDecoratorNode;
}
