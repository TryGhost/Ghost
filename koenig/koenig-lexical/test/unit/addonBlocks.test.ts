import {buildAddonNodeData} from '../../src/utils/addon-blocks';
import {describe, expect, it} from 'vitest';

describe('add-on editor blocks', function () {
    it('builds one generic node snapshot from trusted definition metadata and render output', function () {
        const definition = {
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Transistor podcast player',
            initialProperties: {episodeId: '1234'},
            resourceOrigins: ['https://media.transistor.fm']
        };
        const renderOutput = {
            html: '<article>Episode 12</article>',
            css: 'article { color: rebeccapurple; }',
            portableHtml: '<p>Episode 12</p>',
            initialHeight: 240,
            resourceOrigins: ['https://provider-controlled.example']
        };

        expect(buildAddonNodeData(definition, renderOutput, 'block-1')).toEqual({
            id: 'block-1',
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Transistor podcast player',
            props: {episodeId: '1234'},
            html: '<article>Episode 12</article>',
            css: 'article { color: rebeccapurple; }',
            portableHtml: '<p>Episode 12</p>',
            resourceOrigins: ['https://media.transistor.fm'],
            hydrate: false,
            initialHeight: 240
        });
    });

    it('rejects insertion when the content renderer does not return a static web snapshot', function () {
        expect(() => buildAddonNodeData({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Transistor podcast player'
        }, {html: ''}, 'block-1')).toThrow('static HTML');
    });

    it('rejects snapshots and metadata the canonical renderer cannot display', function () {
        expect(() => buildAddonNodeData({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'x'.repeat(201)
        }, {html: '<article>Episode</article>'}, 'block-1')).toThrow('invalid');

        expect(() => buildAddonNodeData({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Episode'
        }, {html: 'x'.repeat(1024 * 1024 + 1)}, 'block-1')).toThrow('invalid');

        expect(() => buildAddonNodeData({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Episode',
            initialProperties: {payload: 'x'.repeat(1024 * 1024 + 1)}
        }, {html: '<article>Episode</article>'}, 'block-1')).toThrow('invalid');

        expect(() => buildAddonNodeData({
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Episode',
            initialProperties: {lossy: undefined}
        }, {html: '<article>Episode</article>'}, 'block-1')).toThrow('invalid');
    });

    it('clamps provider height hints to the platform bounds', function () {
        const definition = {
            addonHandle: 'transistor',
            blockName: 'episode-player',
            label: 'Episode'
        };

        expect(buildAddonNodeData(definition, {html: '<p>Episode</p>', initialHeight: -10}, 'low').initialHeight).toBe(80);
        expect(buildAddonNodeData(definition, {html: '<p>Episode</p>', initialHeight: 1_000_000_000}, 'high').initialHeight).toBe(20_000);
    });
});
