import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseButtonNode} from './ButtonParser';
import {renderButtonNode} from './ButtonRenderer';

export class ButtonNode extends generateDecoratorNode({nodeType: 'button',
    properties: [
        {name: 'buttonText', default: ''},
        {name: 'alignment', default: 'center'},
        {name: 'buttonUrl', default: '', urlType: 'url'}
    ]}
) {
    static importDOM() {
        return parseButtonNode(this);
    }

    exportDOM(options = {}) {
        return renderButtonNode(this, options);
    }
}

export const $createButtonNode = (dataset) => {
    return new ButtonNode(dataset);
};

export function $isButtonNode(node) {
    return node instanceof ButtonNode;
}
