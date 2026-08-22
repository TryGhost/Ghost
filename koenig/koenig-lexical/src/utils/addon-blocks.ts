import {isSafeAddonSnapshot, normalizeAddonHeight} from '@tryghost/kg-default-nodes';
import type {AddonNodeData, AddonResourcePolicy} from '@tryghost/kg-default-nodes';

export interface AddonBlockDefinition {
    addonHandle: string;
    blockName: string;
    label: string;
    description?: string;
    keywords?: string[];
    initialProperties?: Record<string, unknown>;
    resourceOrigins?: string[];
    resourcePolicy?: AddonResourcePolicy;
    hasSettings?: boolean;
    hasHydration?: boolean;
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
    createSettingsSurface?: (request: AddonSettingsSurfaceRequest) => AddonSettingsSurface;
}

export interface AddonSettingsSurfaceRequest extends AddonBlockRenderRequest {
    onPatch: (patch: Record<string, unknown>) => Promise<void>;
}

export interface AddonSettingsSurface {
    receiver: unknown;
    ready: Promise<void>;
    updateProps: (props: Record<string, unknown>) => Promise<void>;
    destroy: () => void;
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
        resourcePolicy: definition.resourcePolicy ? structuredClone(definition.resourcePolicy) : undefined,
        hydrate: definition.hasHydration === true,
        initialHeight: normalizeAddonHeight(output.initialHeight)
    };

    if (!isSafeAddonSnapshot(dataset)) {
        throw new Error('Add-on block renderer returned an invalid snapshot');
    }

    return dataset;
}
