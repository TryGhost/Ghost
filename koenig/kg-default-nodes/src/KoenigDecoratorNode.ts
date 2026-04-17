/* c8 ignore start */
import {DecoratorNode} from 'lexical';

export class KoenigDecoratorNode extends DecoratorNode<unknown> {
    static transform() {
        return null;
    }

    decorate(): unknown {
        return null;
    }
}

export function $isKoenigCard(node: unknown): node is KoenigDecoratorNode {
    return node instanceof KoenigDecoratorNode;
}
/* c8 ignore end */
