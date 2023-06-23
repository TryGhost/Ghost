import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderEmailNode} from './EmailRenderer';

export class EmailNode extends generateDecoratorNode({nodeType: 'email',
    properties: [
        {name: 'html', default: '', urlType: 'html'}
    ]}
) {
    exportDOM(options = {}) {
        return renderEmailNode(this, options);
    }
}

export const $createEmailNode = (dataset) => {
    return new EmailNode(dataset);
};

export function $isEmailNode(node) {
    return node instanceof EmailNode;
}
