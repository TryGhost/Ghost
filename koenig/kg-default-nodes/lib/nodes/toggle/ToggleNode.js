import {createCommand} from 'lexical';
import {KoenigDecoratorNode} from '../../KoenigDecoratorNode';
import {ToggleParser} from './ToggleParser';
import {renderToggleNodeToDOM} from './ToggleRenderer';

export const INSERT_TOGGLE_COMMAND = createCommand();
const NODE_TYPE = 'toggle';

export class ToggleNode extends KoenigDecoratorNode {
    // payload properties
    __content;
    __heading;

    static getType() {
        return NODE_TYPE;
    }

    static clone(node) {
        return new this(
            node.getDataset(),
            node.__key
        );
    }

    static get urlTransformMap() {
        return {
            content: 'html',
            heading: 'html'
        };
    }

    getDataset() {
        const self = this.getLatest();
        return {
            content: self.__content,
            heading: self.__heading
        };
    }

    constructor({content, heading} = {}, key) {
        super(key);
        this.__content = content || '';
        this.__heading = heading || '';
    }

    static importJSON(serializedNode) {
        const {content, heading} = serializedNode;
        return new this({
            content,
            heading
        });
    }

    exportJSON() {
        const dataset = {
            type: NODE_TYPE,
            version: 1,
            content: this.getContent(),
            heading: this.getHeading()
        };
        return dataset;
    }

    static importDOM() {
        const parser = new ToggleParser(this);
        return parser.DOMConversionMap;
    }

    exportDOM(options = {}) {
        const element = renderToggleNodeToDOM(this, options);
        return {element};
    }

    getContent() {
        const self = this.getLatest();
        return self.__content;
    }

    setContent(content) {
        const writable = this.getWritable();
        return writable.__content = content;
    }

    getHeading() {
        const self = this.getLatest();
        return self.__heading;
    }

    setHeading(heading) {
        const writable = this.getWritable();
        return writable.__heading = heading;
    }

    hasEditMode() {
        return true;
    }

    isEmpty() {
        return !this.__heading && !this.__content;
    }
}

export const $createToggleNode = (dataset) => {
    return new ToggleNode(dataset);
};

export function $isToggleNode(node) {
    return node instanceof ToggleNode;
}
