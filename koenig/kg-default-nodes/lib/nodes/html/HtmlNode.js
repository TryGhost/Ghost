/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderHtmlNode} from './html-renderer';
import {parseHtmlNode} from './html-parser';

export class HtmlNode extends generateDecoratorNode({
    nodeType: 'html',
    hasVisibility: true,
    properties: [
        {name: 'html', default: '', urlType: 'html', wordCount: true}
    ],
    defaultRenderFn: renderHtmlNode
}) {
    static importDOM() {
        return parseHtmlNode(this);
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
