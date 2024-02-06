declare module '@tryghost/kg-default-nodes' {
    import {LexicalNode, DecoratorNode, LexicalEditor, ElementNode} from 'lexical';
    import * as KgDefaultNodes from '@tryghost/kg-default-nodes';

    export interface RendererOptions {
        usedIdAttributes?: Record<string, number>;
        dom?: import('jsdom').JSDOM,
        type?: 'inner' | 'outer' | 'value'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    type X = any;

    export class KoenigDecoratorNode extends DecoratorNode<X> {
        // TODO: exportDOM override isn't directly compatible with base class, should fix when converting kg-default-nodes
        exportDOM(options: LexicalEditor | RendererOptions): {
            element: HTMLElement | HTMLInputElement | HTMLTextAreaElement;
            type: 'inner' | 'outer' | 'value'
        };
        hasDynamicData?(): boolean;
        getDynamicData?(options: RendererOptions): Promise<{key: number; data: unknown}>;
    }
    export function $isKoenigCard(node: LexicalNode): node is KgDefaultNodes.KoenigDecoratorNode;

    export class AsideNode extends ElementNode {}
    export function $isAsideNode(node: LexicalNode): node is KgDefaultNodes.AsideNode;
}
