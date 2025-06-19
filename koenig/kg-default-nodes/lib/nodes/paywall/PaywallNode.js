/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {parsePaywallNode} from './paywall-parser';

export class PaywallNode extends generateDecoratorNode({
    nodeType: 'paywall'
}) {
    static importDOM() {
        return parsePaywallNode(this);
    }
}

export const $createPaywallNode = (dataset) => {
    return new PaywallNode(dataset);
};

export function $isPaywallNode(node) {
    return node instanceof PaywallNode;
}
