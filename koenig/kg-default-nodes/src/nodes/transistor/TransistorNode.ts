import cloneDeep from 'lodash/cloneDeep';
import {generateDecoratorNode, type DecoratorNodeProperty} from '../../generate-decorator-node.js';
import {renderTransistorNode} from './transistor-renderer.js';
import {ALL_MEMBERS_SEGMENT} from '../../utils/visibility.js';
import type {Visibility} from '../../utils/visibility.js';

// Default visibility for Transistor: members only (no public visitors)
// since the embed requires a member UUID to function
const TRANSISTOR_DEFAULT_VISIBILITY = {
    web: {
        nonMember: false, // Hide from public visitors - requires member UUID
        memberSegment: ALL_MEMBERS_SEGMENT // Show to all members (free + paid)
    },
    email: {
        memberSegment: ALL_MEMBERS_SEGMENT
    }
};

export interface TransistorNode {
    accentColor: string;
    backgroundColor: string;
    visibility: Visibility;
}

export interface TransistorData {
    accentColor?: string;
    backgroundColor?: string;
    visibility?: Visibility;
}

const transistorProperties = [
    {name: 'accentColor', default: ''},
    {name: 'backgroundColor', default: ''}
] as const satisfies readonly DecoratorNodeProperty[];

export class TransistorNode extends generateDecoratorNode({
    nodeType: 'transistor',
    hasVisibility: true,
    properties: transistorProperties,
    defaultRenderFn: renderTransistorNode
}) {
    constructor(data: TransistorData = {}, key?: string) {
        super(data, key);
        if (!data.visibility) {
            this.__visibility = cloneDeep(TRANSISTOR_DEFAULT_VISIBILITY);
        }
    }

    static getPropertyDefaults() {
        const defaults = super.getPropertyDefaults();
        defaults.visibility = cloneDeep(TRANSISTOR_DEFAULT_VISIBILITY);
        return defaults;
    }

    isEmpty() {
        return false; // Transistor card is never empty as it has a fixed URL
    }

    hasEditMode() {
        return true;
    }
}

export const $createTransistorNode = (dataset?: TransistorData) => {
    return new TransistorNode(dataset);
};

export const $isTransistorNode = (node: unknown): node is TransistorNode => {
    return node instanceof TransistorNode;
};
