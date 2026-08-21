import {describe, expect, it} from 'vitest';
import {h} from 'preact';
import {useMemo} from 'preact/hooks';
import {defineEditorBlockRenderer} from '../../src/editor/index.ts';
import {renderEditorBlockModule} from '../../src/sandbox/render-block.ts';

describe('renderEditorBlockModule', function () {
    it('accepts durable strings serialized by the provider-owned Preact runtime', async function () {
        function StatefulTitle({title}: {title: string}) {
            const upperTitle = useMemo(() => title.toUpperCase(), [title]);
            return h('strong', null, upperTitle);
        }

        const providerRenderer = defineEditorBlockRenderer(({blockName, props}) => ({
            content: h('article', {'data-block': blockName}, h(StatefulTitle, {title: String(props.episodeTitle)})),
            portableContent: h('p', null, String(props.episodeTitle)),
            css: 'article { color: rebeccapurple; }',
            initialHeight: 240
        }));
        const output = await renderEditorBlockModule({
            default: providerRenderer
        }, {
            blockName: 'episode-player',
            props: {episodeTitle: 'Episode 12'}
        });

        expect(output).toEqual({
            html: '<article data-block="episode-player"><strong>EPISODE 12</strong></article>',
            portableHtml: '<p>Episode 12</p>',
            css: 'article { color: rebeccapurple; }',
            initialHeight: 240
        });
    });

    it('requires a static web component', async function () {
        const providerRenderer = defineEditorBlockRenderer(() => ({content: null}));

        await expect(renderEditorBlockModule({
            default: providerRenderer
        }, {blockName: 'empty', props: {}})).rejects.toThrow('web content');
    });
});
