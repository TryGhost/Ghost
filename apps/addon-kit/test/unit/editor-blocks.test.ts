import {describe, expect, it, vi} from 'vitest';
import {createAddonEditorBlocksConfig} from '../../src/host/editor-blocks.ts';
import type {AddonInstallRecord} from '../../src/types.ts';

const install: AddonInstallRecord = {
    manifestUrl: 'https://podcasts.example/manifest.json',
    handle: 'transistor',
    name: 'Transistor',
    enabled: true,
    version: '1.0.0',
    apiVersion: '2026-01',
    editor: {
        blocks: [{name: 'episode-player', label: 'Transistor episode', hydrate: true}],
        contentBundleUrl: 'https://podcasts.example/editor.js',
        integrity: 'sha256-pinned',
        settingsBundleUrl: 'https://podcasts.example/settings.js',
        settingsIntegrity: 'sha256-settings'
    },
    targeting: []
};

describe('createAddonEditorBlocksConfig', function () {
    it('exposes provider-specific blocks backed by the pinned sandbox renderer', async function () {
        const controller = {
            start: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
            renderBlock: vi.fn().mockResolvedValue({
                html: '<transistor-player></transistor-player>',
                portableHtml: '<p>Listen to the episode</p>',
                css: '',
                initialHeight: 240
            }),
            renderSettings: vi.fn().mockResolvedValue(undefined),
            updateSettingsProps: vi.fn().mockResolvedValue(undefined),
            destroy: vi.fn()
        };
        const config = createAddonEditorBlocksConfig([install], {
            createController: () => controller
        });

        expect(config.blocks).toEqual([{
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Transistor episode',
            description: undefined,
            keywords: undefined,
            initialProperties: undefined,
            resourceOrigins: undefined,
            hasSettings: true,
            hasHydration: true
        }]);

        await expect(config.renderBlock({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {episodeId: '123'}
        })).resolves.toEqual({
            html: '<transistor-player></transistor-player>',
            portableHtml: '<p>Listen to the episode</p>',
            css: '',
            initialHeight: 240
        });
        expect(controller.start).toHaveBeenCalledWith({staticExecution: true});
        expect(controller.loadBundle).toHaveBeenCalledWith({
            url: 'https://podcasts.example/editor.js',
            integrity: 'sha256-pinned'
        });
        expect(controller.renderBlock).toHaveBeenCalledWith({
            bundleUrl: 'https://podcasts.example/editor.js',
            request: {blockName: 'episode-player', props: {episodeId: '123'}}
        });
        expect(controller.destroy).toHaveBeenCalledOnce();
    });

    it('passes site presentation context to content and settings renderers', async function () {
        const receiver = {connection: {mutate: vi.fn(), call: vi.fn()}};
        const controller = {
            start: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
            renderBlock: vi.fn().mockResolvedValue({html: '<p>Event</p>', portableHtml: '<p>Event</p>', css: '', initialHeight: 240}),
            renderSettings: vi.fn().mockResolvedValue(undefined),
            updateSettingsProps: vi.fn().mockResolvedValue(undefined),
            destroy: vi.fn()
        };
        const config = createAddonEditorBlocksConfig([install], {
            createController: () => controller,
            createReceiver: () => receiver
        }, {siteTimezone: 'Europe/Stockholm'});

        await config.renderBlock({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {}
        });
        const surface = config.createSettingsSurface!({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {},
            onPatch: vi.fn().mockResolvedValue(undefined)
        });
        await surface.ready;

        expect(controller.renderBlock.mock.calls[0][0].request.context).toEqual({siteTimezone: 'Europe/Stockholm'});
        expect(controller.renderSettings.mock.calls[0][0].request.context).toEqual({siteTimezone: 'Europe/Stockholm'});
    });

    it('creates a long-lived remote settings surface for one block', async function () {
        const receiver = {connection: {mutate: vi.fn(), call: vi.fn()}};
        const controller = {
            start: vi.fn().mockResolvedValue(undefined),
            loadBundle: vi.fn().mockResolvedValue(undefined),
            renderBlock: vi.fn(),
            renderSettings: vi.fn().mockResolvedValue(undefined),
            updateSettingsProps: vi.fn().mockResolvedValue(undefined),
            destroy: vi.fn()
        };
        const onPatch = vi.fn().mockResolvedValue(undefined);
        const config = createAddonEditorBlocksConfig([install], {
            createController: () => controller,
            createReceiver: () => receiver
        });

        const surface = config.createSettingsSurface!({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            props: {episodeId: '123'},
            onPatch
        });

        expect(surface.receiver).toBe(receiver);
        await expect(surface.ready).resolves.toBeUndefined();
        expect(controller.start).toHaveBeenCalledWith();
        expect(controller.loadBundle).toHaveBeenCalledWith({
            url: 'https://podcasts.example/settings.js',
            integrity: 'sha256-settings'
        });
        expect(controller.renderSettings).toHaveBeenCalledWith({
            bundleUrl: 'https://podcasts.example/settings.js',
            connection: receiver.connection,
            request: {blockName: 'episode-player', props: {episodeId: '123'}},
            capabilities: {fetch: expect.any(Function)},
            proposePatch: expect.any(Function)
        });

        const proposePatch = controller.renderSettings.mock.calls[0][0].proposePatch;
        await proposePatch({episodeId: '456'});
        expect(onPatch).toHaveBeenCalledWith({episodeId: '456'});

        await surface.updateProps({episodeId: '456'});
        expect(controller.updateSettingsProps).toHaveBeenCalledWith({episodeId: '456'});
        surface.destroy();
        expect(controller.destroy).toHaveBeenCalledOnce();
    });

    it('rejects undeclared blocks before starting a sandbox', async function () {
        const createController = vi.fn();
        const config = createAddonEditorBlocksConfig([install], {createController});

        await expect(config.renderBlock({
            addonHandle: 'transistor',
            blockName: 'undeclared',
            props: {}
        })).rejects.toThrow('not declared');
        expect(createController).not.toHaveBeenCalled();
    });
});
