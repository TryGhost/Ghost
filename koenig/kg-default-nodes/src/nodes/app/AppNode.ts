import {generateDecoratorNode, type DecoratorNodeData, type DecoratorNodePropertyMap} from '../../generate-decorator-node.js';
import {renderAppNode} from './app-renderer.js';

export {
    APP_CARD_MAX_BYTES,
    APP_CARD_MAX_HEIGHT,
    APP_CARD_MIN_HEIGHT,
    filterAppCardOrigins,
    isValidAppCard,
    normaliseAppCardHeight,
    resolvePostLinks,
    sanitiseAppCardMarkup
} from './app-renderer.js';
export type {AppCardData, AppCardLookup} from './app-renderer.js';
export {
    APP_CARD_FRAME_SCRIPT,
    APP_CARD_FRAME_SCRIPT_HASH,
    cspSources,
    renderAppCardDocument
} from './app-card-document.js';
export type {AppCardDocumentOptions} from './app-card-document.js';

/**
 * A card an app adds to the editor. It holds what the app's code rendered from the card's
 * properties, so posts show the card without the app, while the app stays installed.
 * `appId` is its own key, which a card usage index can match exactly.
 */
const appProperties = {
    appId: {default: ''},
    card: {default: ''},
    properties: {default: {} as Record<string, unknown>},
    publicProperties: {default: [] as string[]},
    html: {default: '', urlType: 'html'},
    css: {default: ''},
    height: {default: 320},
    emailHtml: {default: '', urlType: 'html'}
} satisfies DecoratorNodePropertyMap;

export type AppData = DecoratorNodeData<typeof appProperties>;

export class AppNode extends generateDecoratorNode({
    nodeType: 'app',
    properties: appProperties,
    defaultRenderFn: renderAppNode
}) {
    constructor(dataset: AppData = {}, key?: string) {
        super({
            ...dataset,
            properties: structuredClone(dataset.properties ?? {}),
            publicProperties: [...(dataset.publicProperties ?? [])]
        }, key);
    }
}

export function $createAppNode(dataset: AppData = {}) {
    return new AppNode(dataset);
}

export function $isAppNode(node: unknown): node is AppNode {
    return node instanceof AppNode;
}
