/* eslint-disable ghost/filenames/match-exported-class */
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderEmailCtaNode} from './email-cta-renderer';

export class EmailCtaNode extends generateDecoratorNode({
    nodeType: 'email-cta',
    properties: [
        {name: 'alignment', default: 'left'},
        {name: 'buttonText', default: ''},
        {name: 'buttonUrl', default: '', urlType: 'url'},
        {name: 'html', default: '', urlType: 'html'},
        {name: 'segment', default: 'status:free'},
        {name: 'showButton', default: false},
        {name: 'showDividers', default: true}
    ],
    defaultRenderFn: renderEmailCtaNode
}) {
}

export const $createEmailCtaNode = (dataset) => {
    return new EmailCtaNode(dataset);
};

export function $isEmailCtaNode(node) {
    return node instanceof EmailCtaNode;
}
