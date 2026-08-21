import {AddonSandboxController} from './sandbox-controller.ts';
import {getEditorBlockDefinitions} from './installs.ts';
import type {
    AddonEditorBlockRenderOutput,
    AddonEditorBlockRequest,
    AddonInstallRecord
} from '../types.ts';

export interface AddonEditorRenderRequest extends AddonEditorBlockRequest {
    addonHandle: string;
}

export interface AddonEditorBlocksConfig {
    blocks: ReturnType<typeof getEditorBlockDefinitions>;
    renderBlock(request: AddonEditorRenderRequest): Promise<AddonEditorBlockRenderOutput>;
}

interface EditorBlockController {
    start(options: {staticExecution: true}): Promise<void>;
    loadBundle(options: {url: string; integrity?: string}): Promise<void>;
    renderBlock(options: {
        bundleUrl: string;
        request: AddonEditorBlockRequest;
    }): Promise<AddonEditorBlockRenderOutput>;
    destroy(): void;
}

interface AddonEditorBlocksDependencies {
    createController(): EditorBlockController;
}

const defaultDependencies: AddonEditorBlocksDependencies = {
    createController: () => new AddonSandboxController()
};

/**
 * Adapts installed manifest metadata to Koenig's generic add-on registry.
 * Rendering is deliberately lazy: a short-lived opaque-origin sandbox is
 * created only when the author inserts or refreshes a block.
 */
export function createAddonEditorBlocksConfig(
    installs: AddonInstallRecord[],
    dependencies: AddonEditorBlocksDependencies = defaultDependencies
): AddonEditorBlocksConfig {
    const blocks = getEditorBlockDefinitions(installs);

    return {
        blocks,
        async renderBlock({addonHandle, blockName, props}) {
            const block = blocks.find(candidate => candidate.addonHandle === addonHandle && candidate.blockName === blockName);
            const install = installs.find(candidate => candidate.enabled && candidate.handle === addonHandle);
            const editor = install?.editor;
            if (!block || !editor || typeof editor.contentBundleUrl !== 'string' || editor.contentBundleUrl.length === 0) {
                throw new Error(`Add-on editor block "${addonHandle}/${blockName}" is not declared`);
            }

            const controller = dependencies.createController();
            try {
                await controller.start({staticExecution: true});
                await controller.loadBundle({
                    url: editor.contentBundleUrl,
                    integrity: editor.integrity
                });
                return await controller.renderBlock({
                    bundleUrl: editor.contentBundleUrl,
                    request: {blockName, props}
                });
            } finally {
                controller.destroy();
            }
        }
    };
}
