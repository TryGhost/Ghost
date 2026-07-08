import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {renderHeaderNodeV1} from './renderers/v1/header-renderer.js';
import {parseHeaderNode} from './parsers/header-parser.js';
// V2 imports below
import {renderHeaderNodeV2} from './renderers/v2/header-renderer.js';

const headerProperties = [
    {name: 'size', default: 'small'},
    {name: 'style', default: 'dark'},
    {name: 'buttonEnabled', default: false},
    {name: 'buttonUrl', default: '', urlType: 'url'},
    {name: 'buttonText', default: ''},
    {name: 'header', default: '', urlType: 'html', wordCount: true},
    {name: 'subheader', default: '', urlType: 'html', wordCount: true},
    {name: 'backgroundImageSrc', default: '', urlType: 'url'},
    {name: 'version', default: 1},
    {name: 'accentColor', default: '#FF1A75'},
    {name: 'alignment', default: 'center'},
    {name: 'backgroundColor', default: '#000000'},
    {name: 'backgroundImageWidth', default: null as number | null},
    {name: 'backgroundImageHeight', default: null as number | null},
    {name: 'backgroundSize', default: 'cover'},
    {name: 'textColor', default: '#FFFFFF'},
    {name: 'buttonColor', default: '#ffffff'},
    {name: 'buttonTextColor', default: '#000000'},
    {name: 'layout', default: 'full'},
    {name: 'swapped', default: false}
] as const satisfies readonly DecoratorNodeProperty[];

export type HeaderData = DecoratorNodeData<typeof headerProperties>;

export interface HeaderNode extends DecoratorNodeValueMap<typeof headerProperties> {}

// This is our first node that has a custom version property
export class HeaderNode extends generateDecoratorNode({
    nodeType: 'header',
    properties: headerProperties,
    defaultRenderFn: {
        1: renderHeaderNodeV1,
        2: renderHeaderNodeV2
    }
}) {
    static importDOM() {
        return parseHeaderNode(this);
    }
}

export const $createHeaderNode = (dataset: HeaderData = {}) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node: unknown): node is HeaderNode {
    return node instanceof HeaderNode;
}
