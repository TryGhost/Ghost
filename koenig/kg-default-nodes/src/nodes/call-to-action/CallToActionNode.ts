import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodeProperty, type DecoratorNodeValueMap} from '../../generate-decorator-node.js';
import {renderCallToActionNode} from './calltoaction-renderer.js';
import {parseCallToActionNode} from './calltoaction-parser.js';

const callToActionProperties = [
    {name: 'layout', default: 'minimal'},
    {name: 'alignment', default: 'left'},
    {name: 'textValue', default: '', wordCount: true},
    {name: 'showButton', default: true},
    {name: 'showDividers', default: true},
    {name: 'buttonText', default: 'Learn more'},
    {name: 'buttonUrl', default: ''},
    {name: 'buttonColor', default: '#000000'},
    {name: 'buttonTextColor', default: '#ffffff'},
    {name: 'hasSponsorLabel', default: true},
    {name: 'sponsorLabel', default: '<p><span style="white-space: pre-wrap;">SPONSORED</span></p>'},
    {name: 'backgroundColor', default: 'grey'},
    {name: 'linkColor', default: 'text'},
    {name: 'imageUrl', default: '' as string | null},
    {name: 'imageWidth', default: null as number | null},
    {name: 'imageHeight', default: null as number | null}
] as const satisfies readonly DecoratorNodeProperty[];

export type CallToActionData = DecoratorNodeData<typeof callToActionProperties, true>;

export interface CallToActionNode extends DecoratorNodeValueMap<typeof callToActionProperties, true> {}

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
