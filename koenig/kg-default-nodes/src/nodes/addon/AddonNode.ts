import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderAddonNode} from './addon-renderer.js';

const addonProperties = {
    id: {default: ''},
    addonHandle: {default: ''},
    blockName: {default: ''},
    label: {default: ''},
    props: {default: {} as Record<string, unknown>},
    html: {default: '', urlType: 'html'},
    css: {default: ''},
    portableHtml: {default: '', urlType: 'html'},
    resourceOrigins: {default: [] as string[]},
    initialHeight: {default: 320}
} satisfies DecoratorNodePropertyMap;

export type AddonData = DecoratorNodeData<typeof addonProperties>;

export class AddonNode extends generateDecoratorNode({
    nodeType: 'addon',
    properties: addonProperties,
    defaultRenderFn: renderAddonNode
}) {
    constructor(dataset: AddonData = {}, key?: string) {
        super({
            ...dataset,
            props: structuredClone(dataset.props ?? {}),
            resourceOrigins: [...(dataset.resourceOrigins ?? [])]
        }, key);
    }
}

export function $createAddonNode(dataset: AddonData = {}) {
    return new AddonNode(dataset);
}

export function $isAddonNode(node: unknown): node is AddonNode {
    return node instanceof AddonNode;
}
