import renderToString from 'preact-render-to-string';
import type {VNode} from 'preact';
import type {
    AddonEditorBlockRenderOutput,
    AddonEditorComponentRenderer
} from '../types.ts';

const DEFAULT_BLOCK_HEIGHT = 320;

/**
 * Defines an editor block inside the add-on bundle. Serialization deliberately
 * happens here, using the provider bundle's own Preact runtime, so no VNodes or
 * hook state cross the sandbox boundary into a second Preact installation.
 */
export function defineEditorBlockRenderer(renderer: AddonEditorComponentRenderer) {
    return async (request: Parameters<AddonEditorComponentRenderer>[0]): Promise<AddonEditorBlockRenderOutput> => {
        const output = await renderer(request);

        if (output.content === null || output.content === undefined || output.content === false) {
            throw new Error('Add-on editor blocks must return static web content');
        }

        const html = renderToString(output.content as VNode);
        if (!html) {
            throw new Error('Add-on editor blocks must return static web content');
        }

        return {
            html,
            portableHtml: output.portableContent === null || output.portableContent === undefined || output.portableContent === false
                ? ''
                : renderToString(output.portableContent as VNode),
            css: typeof output.css === 'string' ? output.css : '',
            initialHeight: Number.isFinite(output.initialHeight) ? output.initialHeight! : DEFAULT_BLOCK_HEIGHT
        };
    };
}

export type {
    AddonEditorBlockRequest,
    AddonEditorComponentOutput,
    AddonEditorComponentRenderer,
    AddonEditorContentModuleExports
} from '../types.ts';
