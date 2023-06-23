import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseToggleNode} from './ToggleParser';
import {renderToggleNode} from './ToggleRenderer';

export class ToggleNode extends generateDecoratorNode({nodeType: 'toggle',
    properties: [
        {name: 'heading', default: '', urlType: 'html', wordCount: true},
        {name: 'content', default: '', urlType: 'html', wordCount: true}
    ]}
) {
    static importDOM() {
        return parseToggleNode(this);
    }

    exportDOM(options = {}) {
        return renderToggleNode(this, options);
    }
}

export const $createToggleNode = (dataset) => {
    return new ToggleNode(dataset);
};

export function $isToggleNode(node) {
    return node instanceof ToggleNode;
}
