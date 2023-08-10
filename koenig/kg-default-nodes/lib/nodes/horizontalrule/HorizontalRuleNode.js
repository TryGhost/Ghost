/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderHorizontalRuleNode} from './horizontalrule-renderer';
import {parseHorizontalRuleNode} from './horizontalrule-parser';

export class HorizontalRuleNode extends generateDecoratorNode({nodeType: 'horizontalrule'}) {
    static importDOM() {
        return parseHorizontalRuleNode(this);
    }

    exportDOM(options = {}) {
        return renderHorizontalRuleNode(this, options);
    }

    getTextContent() {
        return '---\n\n';
    }

    hasEditMode() {
        return false;
    }
}

export function $createHorizontalRuleNode() {
    return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node) {
    return node instanceof HorizontalRuleNode;
}
