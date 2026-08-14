/* c8 ignore start */
import {DecoratorNode} from 'lexical';
import type {LexicalEditor} from 'lexical';
import type {ExportDOMOptions, ExportDOMOutput} from './export-dom.js';

export class KoenigDecoratorNode extends DecoratorNode<unknown> {
    static transform() {
        return null;
    }

    decorate(): unknown {
        return null;
    }
}

export type KoenigCard<TOutput extends ExportDOMOutput = ExportDOMOutput> = KoenigDecoratorNode & {
    [key: string]: unknown;

    isKoenigCard(): true;
    exportDOM(editor: LexicalEditor, options?: ExportDOMOptions): TOutput;
    getDataset(): Record<string, unknown>;
    hasDynamicData(): boolean;
    hasEditMode(): boolean;
    getIsVisibilityActive(): boolean;
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
        typeof card.getDataset === 'function' &&
        typeof card.hasDynamicData === 'function' &&
        typeof card.hasEditMode === 'function' &&
        typeof card.getIsVisibilityActive === 'function';
}
/* c8 ignore end */
