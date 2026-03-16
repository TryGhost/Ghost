/* c8 ignore start */
import {DecoratorNode} from 'lexical';
import type {ExportDOMOptions, ExportDOMOutput} from './export-dom.js';

export class KoenigDecoratorNode extends DecoratorNode<unknown> {
    static transform() {
        return null;
    }

    decorate(): unknown {
        return null;
    }
}

export type KoenigCard = KoenigDecoratorNode & {
    isKoenigCard(): true;
    exportDOM(options: ExportDOMOptions): ExportDOMOutput;
    hasDynamicData(): boolean;
    getDynamicData?(options: ExportDOMOptions): Promise<{key: number; data: unknown}>;
};

export function $isKoenigCard(node: unknown): node is KoenigCard {
    if (!(node instanceof KoenigDecoratorNode)) {
        return false;
    }

    const card = node as Partial<KoenigCard>;

    return typeof card.isKoenigCard === 'function' &&
        card.isKoenigCard() === true &&
        typeof card.exportDOM === 'function' &&
        typeof card.hasDynamicData === 'function';
}
/* c8 ignore end */
