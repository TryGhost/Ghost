// eslint-disable-next-line ghost/filenames/match-exported-class
import cloneDeep from 'lodash/cloneDeep';
import {generateDecoratorNode} from '../../generate-decorator-node';
import {renderTransistorNode} from './transistor-renderer';
import {ALL_MEMBERS_SEGMENT} from '../../utils/visibility';

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

export class TransistorNode extends generateDecoratorNode({
    nodeType: 'transistor',
    hasVisibility: true,
    properties: [
        {name: 'accentColor', default: ''}, // Player accent color (text/buttons) - hex value
        {name: 'backgroundColor', default: ''} // Player background color - hex value
    ],
    defaultRenderFn: renderTransistorNode
}) {
    constructor(data = {}, key) {
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

export const $createTransistorNode = (dataset) => {
    return new TransistorNode(dataset);
};

export const $isTransistorNode = (node) => {
    return node instanceof TransistorNode;
};
