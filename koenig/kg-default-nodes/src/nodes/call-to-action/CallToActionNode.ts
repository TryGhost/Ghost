import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderCallToActionNode} from './calltoaction-renderer.js';
import {parseCallToActionNode} from './calltoaction-parser.js';

const callToActionProperties = {
    layout: {default: 'minimal'},
    alignment: {default: 'left'},
    textValue: {default: '', wordCount: true},
    showButton: {default: true},
    showDividers: {default: true},
    buttonText: {default: 'Learn more'},
    buttonUrl: {default: ''},
    buttonColor: {default: '#000000'},
    buttonTextColor: {default: '#ffffff'},
    hasSponsorLabel: {default: true},
    sponsorLabel: {default: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'},
    backgroundColor: {default: 'grey'},
    linkColor: {default: 'text'},
    imageUrl: {default: '' as string | null},
    imageWidth: {default: null as number | null},
    imageHeight: {default: null as number | null}
} satisfies DecoratorNodePropertyMap;

export type CallToActionData = DecoratorNodeData<typeof callToActionProperties, true>;

export class CallToActionNode extends generateDecoratorNode({
    nodeType: 'call-to-action',
    hasVisibility: true,
    properties: callToActionProperties,
    defaultRenderFn: renderCallToActionNode
}) {
    static importDOM() {
        return parseCallToActionNode(this);
    }
}

export const $createCallToActionNode = (dataset?: CallToActionData) => {
    return new CallToActionNode(dataset);
};

export const $isCallToActionNode = (node: unknown): node is CallToActionNode => {
    return node instanceof CallToActionNode;
};
