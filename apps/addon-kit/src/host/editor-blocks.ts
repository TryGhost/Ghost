import {AddonSandboxController} from './sandbox-controller.ts';
import {createEditorFetchCapability} from './host-fetch.ts';
import {getEditorBlockDefinitions} from './installs.ts';
import {RemoteReceiver} from '@remote-dom/core/receivers';
import {release, retain} from '@quilted/threads';
import type {RemoteConnection} from '@remote-dom/core/elements';
import type {
    AddonAssetReference,
    AddonEditorBlockRenderOutput,
    AddonEditorBlockRequest,
    AddonEditorPresentationContext,
    AddonGeneratedImage,
    AddonInstallRecord
} from '../types.ts';

export interface AddonEditorRenderRequest extends AddonEditorBlockRequest {
    addonHandle: string;
}

export interface AddonEditorBlocksConfig {
    blocks: ReturnType<typeof getEditorBlockDefinitions>;
    renderBlock(request: AddonEditorRenderRequest): Promise<AddonEditorBlockRenderOutput>;
    createSettingsSurface?(request: AddonEditorSettingsSurfaceRequest): AddonEditorSettingsSurface;
}

export interface AddonEditorSettingsSurfaceRequest extends AddonEditorRenderRequest {
    onPatch(patch: Record<string, unknown>): Promise<void>;
    uploadImage(image: AddonGeneratedImage): Promise<AddonAssetReference>;
}

export interface AddonEditorSettingsSurface {
    receiver: unknown;
    ready: Promise<void>;
    updateProps(props: Record<string, unknown>): Promise<void>;
    destroy(): void;
}

interface EditorBlockController {
    start(options?: {staticExecution?: boolean}): Promise<void>;
    loadBundle(options: {url: string; integrity?: string}): Promise<void>;
    renderBlock(options: {
        bundleUrl: string;
        request: AddonEditorBlockRequest;
    }): Promise<AddonEditorBlockRenderOutput>;
    renderSettings(options: {
        bundleUrl: string;
        connection: RemoteConnection;
        request: AddonEditorBlockRequest;
        capabilities: ReturnType<typeof createEditorFetchCapability> & {
            uploadImage(image: AddonGeneratedImage): Promise<AddonAssetReference>;
        };
        proposePatch: (patch: Record<string, unknown>) => Promise<void>;
    }): Promise<void>;
    updateSettingsProps(props: Record<string, unknown>): Promise<void>;
    destroy(): void;
}

interface EditorSettingsReceiver {
    connection: RemoteConnection;
}

interface AddonEditorBlocksDependencies {
    createController(): EditorBlockController;
    createReceiver(): EditorSettingsReceiver;
}

const defaultDependencies: AddonEditorBlocksDependencies = {
    createController: () => new AddonSandboxController(),
    createReceiver: () => new RemoteReceiver({retain, release})
};

/**
 * Adapts installed manifest metadata to Koenig's generic add-on registry.
 * Rendering is deliberately lazy: a short-lived opaque-origin sandbox is
 * created only when the author inserts or refreshes a block.
 */
export function createAddonEditorBlocksConfig(
    installs: AddonInstallRecord[],
    dependencies: Partial<AddonEditorBlocksDependencies> = defaultDependencies,
    context: AddonEditorPresentationContext = {}
): AddonEditorBlocksConfig {
    const resolvedDependencies = {...defaultDependencies, ...dependencies};
    const blocks = getEditorBlockDefinitions(installs);
    const presentationContext = Object.keys(context).length > 0 ? structuredClone(context) : undefined;

    return {
        blocks,
        async renderBlock({addonHandle, blockName, props}) {
            const block = blocks.find(candidate => candidate.addonHandle === addonHandle && candidate.blockName === blockName);
            const install = installs.find(candidate => candidate.enabled && candidate.handle === addonHandle);
            const editor = install?.editor;
            if (!block || !editor || typeof editor.contentBundleUrl !== 'string' || editor.contentBundleUrl.length === 0) {
                throw new Error(`Add-on editor block "${addonHandle}/${blockName}" is not declared`);
            }

            const controller = resolvedDependencies.createController();
            try {
                await controller.start({staticExecution: true});
                await controller.loadBundle({
                    url: editor.contentBundleUrl,
                    integrity: editor.integrity
                });
                return await controller.renderBlock({
                    bundleUrl: editor.contentBundleUrl,
                    request: {blockName, props, ...(presentationContext ? {context: structuredClone(presentationContext)} : {})}
                });
            } finally {
                controller.destroy();
            }
        },
        createSettingsSurface({addonHandle, blockName, props, onPatch, uploadImage}) {
            const block = blocks.find(candidate => candidate.addonHandle === addonHandle && candidate.blockName === blockName);
            const install = installs.find(candidate => candidate.enabled && candidate.handle === addonHandle);
            const editor = install?.editor;
            const bundleUrl = editor?.settingsBundleUrl;
            if (!install || !block?.hasSettings || typeof bundleUrl !== 'string' || bundleUrl.length === 0) {
                throw new Error(`Add-on editor block "${addonHandle}/${blockName}" has no settings bundle`);
            }

            const controller = resolvedDependencies.createController();
            const receiver = resolvedDependencies.createReceiver();
            const ready = (async () => {
                await controller.start();
                await controller.loadBundle({url: bundleUrl, integrity: editor?.settingsIntegrity});
                await controller.renderSettings({
                    bundleUrl,
                    connection: receiver.connection,
                    request: {blockName, props: structuredClone(props), ...(presentationContext ? {context: structuredClone(presentationContext)} : {})},
                    capabilities: {
                        ...createEditorFetchCapability(install),
                        async uploadImage(image) {
                            return structuredClone(await uploadImage(structuredClone(image)));
                        }
                    },
                    proposePatch: patch => onPatch(structuredClone(patch))
                });
            })();

            return {
                receiver,
                ready,
                async updateProps(nextProps) {
                    await ready;
                    await controller.updateSettingsProps(structuredClone(nextProps));
                },
                destroy() {
                    controller.destroy();
                }
            };
        }
    };
}
