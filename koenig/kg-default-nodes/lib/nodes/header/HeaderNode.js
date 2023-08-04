import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderHeaderNodeV1} from './renderers/v1/HeaderRenderer';
import {parseHeaderNodeV1} from './parsers/v1/HeaderParser';
// V2 imports below
import {renderHeaderNodeV2} from './renderers/v2/HeaderRenderer';

// This is our first node that has a custom version property
export class HeaderNode extends generateDecoratorNode({nodeType: 'header',
    properties: [
        {name: 'size', default: 'small'},
        {name: 'style', default: 'dark'},
        {name: 'buttonEnabled', default: false},
        {name: 'buttonUrl', default: '', urlType: 'url'},
        {name: 'buttonText', default: ''},
        {name: 'header', default: '', urlType: 'html', wordCount: true},
        {name: 'subheader', default: '', urlType: 'html', wordCount: true},
        {name: 'backgroundImageSrc', default: '', urlType: 'url'},
        // we need to initialize a new version property here so that we can separate v1 and v2
        // we should never remove old properties, only add new ones, as this could break & corrupt existing content
        // ref https://lexical.dev/docs/concepts/serialization#versioning--breaking-changes
        {name: 'version', default: 1},
        {name: 'accentColor', default: '#FF1A75'}, // this is used to have the accent color hex for email
        // v2 properties
        {name: 'alignment', default: 'center'},
        {name: 'backgroundColor', default: '#F0F0F0'},
        {name: 'backgroundSize', default: 'cover'},
        {name: 'textColor', default: '#000000'},
        {name: 'buttonColor', default: 'accent'},
        {name: 'buttonTextColor', default: '#FFFFFF'},
        {name: 'layout', default: 'wide'}, // replaces size
        {name: 'swapped', default: false}
    ]}
) {
    static importDOM() {
        return parseHeaderNodeV1(this);
    }

    exportDOM(options = {}) {
        if (this.version === 1) {
            return renderHeaderNodeV1(this, options);
        }

        if (this.version === 2) {
            return renderHeaderNodeV2(this, options);
        }
    }
}

export const $createHeaderNode = (dataset) => {
    return new HeaderNode(dataset);
};

export function $isHeaderNode(node) {
    return node instanceof HeaderNode;
}
