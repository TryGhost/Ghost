import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {renderHorizontalRuleToDOM} from './HorizontalRuleRenderer';
import {HorizontalRuleParser} from './HorizontalRuleParser';

export const INSERT_HORIZONTAL_RULE_COMMAND = createCommand();

export class HorizontalRuleNode extends KoenigDecoratorNode {
    static getType() {
        return 'horizontalrule';
    }

    static clone(node) {
        return new this(
            node.__key
        );
    }

    static get urlTransformMap() {
        return {};
    }

    constructor(key) {
        super(key);
    }

    static importJSON() {
        const node = new this();
        return node;
    }

    exportJSON() {
        const dataset = {
            type: 'horizontalrule',
            version: 1
        };
        return dataset;
    }

    static importDOM() {
        const parser = new HorizontalRuleParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderHorizontalRuleToDOM(this, options);
        return {element};
    }

    getTextContent() {
        return '\n';
    }
}

export function $createHorizontalRuleNode() {
    return new HorizontalRuleNode();
}

export function $isHorizontalRuleNode(node) {
    return node instanceof HorizontalRuleNode;
}
