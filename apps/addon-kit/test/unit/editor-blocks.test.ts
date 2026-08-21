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
        blocks: [{name: 'episode-player', label: 'Transistor episode'}],
        contentBundleUrl: 'https://podcasts.example/editor.js',
        integrity: 'sha256-pinned'
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
            resourceOrigins: undefined
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
