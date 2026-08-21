import {isSafeAddonSnapshot, normalizeAddonHeight} from '@tryghost/kg-default-nodes';
import type {AddonNodeData} from '@tryghost/kg-default-nodes';

export interface AddonBlockDefinition {
    addonHandle: string;
    blockName: string;
    label: string;
    description?: string;
    keywords?: string[];
    initialProperties?: Record<string, unknown>;
    resourceOrigins?: string[];
}

export interface AddonBlockRenderRequest {
    addonHandle: string;
    blockName: string;
    props: Record<string, unknown>;
}

export interface AddonBlockRenderOutput {
    html: string;
    css?: string;
    portableHtml?: string;
    initialHeight?: number;
}

export interface AddonBlocksConfig {
    blocks: AddonBlockDefinition[];
    renderBlock?: (request: AddonBlockRenderRequest) => Promise<AddonBlockRenderOutput>;
    createId?: () => string;
}

export function buildAddonNodeData(
    definition: AddonBlockDefinition,
    output: AddonBlockRenderOutput,
    id: string
): AddonNodeData {
    if (typeof output?.html !== 'string' || output.html.trim().length === 0) {
        throw new Error('Add-on block renderer must return static HTML');
    }

    const props = structuredClone(definition.initialProperties ?? {});
    const resourceOrigins = Array.isArray(definition.resourceOrigins)
        ? definition.resourceOrigins.filter((origin): origin is string => typeof origin === 'string')
        : [];

    const dataset: AddonNodeData = {
        id,
        addonHandle: definition.addonHandle,
        blockName: definition.blockName,
        label: definition.label,
        props,
        html: output.html,
        css: typeof output.css === 'string' ? output.css : '',
        portableHtml: typeof output.portableHtml === 'string' ? output.portableHtml : '',
        resourceOrigins: [...resourceOrigins],
        initialHeight: normalizeAddonHeight(output.initialHeight)
    };

    if (!isSafeAddonSnapshot(dataset)) {
        throw new Error('Add-on block renderer returned an invalid snapshot');
    }

    return dataset;
}
