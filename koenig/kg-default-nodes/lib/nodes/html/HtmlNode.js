/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderHtmlNode} from './html-renderer';
import {parseHtmlNode} from './html-parser';
import {DEFAULT_VISIBILITY, usesOldVisibilityFormat, migrateOldVisibilityFormat} from '../../utils/visibility';

export class HtmlNode extends generateDecoratorNode({nodeType: 'html',
    properties: [
        {name: 'html', default: '', urlType: 'html', wordCount: true},
        {name: 'visibility', default: {...DEFAULT_VISIBILITY}}
    ]}
) {
    constructor({
        html = '',
        visibility = {...DEFAULT_VISIBILITY}
    } = {}, key) {
        super(key);
        this.html = html;
        this.visibility = visibility;
    }

    static importJSON(serializedNode) {
        const {visibility} = serializedNode;

        // migrate older nodes that were saved with an earlier version of the visibility format
        if (visibility && usesOldVisibilityFormat(visibility)) {
            migrateOldVisibilityFormat(visibility);
        }

        return super.importJSON(serializedNode);
    }

    static importDOM() {
        return parseHtmlNode(this);
    }

    exportDOM(options = {}) {
        return renderHtmlNode(this, options);
    }

    isEmpty() {
        return !this.__html;
    }
}

export function $createHtmlNode(dataset) {
    return new HtmlNode(dataset);
}

export function $isHtmlNode(node) {
    return node instanceof HtmlNode;
}
