import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderHeaderNode} from './HeaderRenderer';
import {parseHeaderNode} from './HeaderParser';

export class HeaderNode extends generateDecoratorNode({nodeType: 'header',
    properties: [
        {name: 'size', default: 'small'},
        {name: 'style', default: 'dark'},
        {name: 'buttonEnabled', default: false},
        {name: 'buttonUrl', default: '', urlType: 'url'},
        {name: 'buttonText', default: ''},
        {name: 'header', default: '', urlType: 'html', wordCount: true},
        {name: 'subheader', default: '', urlType: 'html', wordCount: true},
        {name: 'backgroundImageSrc', default: '', urlType: 'url'}
    ]}
) {
    static importDOM() {
        return parseHeaderNode(this);
    }

    exportDOM(options = {}) {
        return renderHeaderNode(this, options);
    }
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}
