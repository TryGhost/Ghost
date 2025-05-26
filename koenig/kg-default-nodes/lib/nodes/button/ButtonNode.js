/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parseButtonNode} from './button-parser';
import {renderButtonNode} from './button-renderer';

export class ButtonNode extends generateDecoratorNode({
    nodeType: 'button',
    properties: [
        {name: 'buttonText', default: ''},
        {name: 'alignment', default: 'center'},
        {name: 'buttonUrl', default: '', urlType: 'url'}
    ],
    defaultRenderFn: renderButtonNode
}) {
    static importDOM() {
        return parseButtonNode(this);
    }
}

export const $createButtonNode = (dataset) => {
    return new ButtonNode(dataset);
};

export function $isButtonNode(node) {
    return node instanceof ButtonNode;
}
