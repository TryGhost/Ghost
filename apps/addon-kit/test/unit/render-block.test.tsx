import { describe, expect, it } from 'vitest';
import { h } from 'preact';
import { useMemo, useState } from 'preact/hooks';
import { defineEditorBlockRenderer } from '../../src/editor/index.ts';
import { renderEditorBlockModule } from '../../src/sandbox/render-block.ts';

describe('renderEditorBlockModule', function () {
  it('accepts durable strings serialized by the provider-owned Preact runtime', async function () {
    function StatefulTitle({ title }: { title: string }) {
      const upperTitle = useMemo(() => title.toUpperCase(), [title]);
      return h('strong', null, upperTitle);
    }

    const providerRenderer = defineEditorBlockRenderer(({ blockName, props }) => ({
      content: h(
        'article',
        { 'data-block': blockName },
        h(StatefulTitle, { title: String(props.episodeTitle) }),
      ),
      portableContent: h('p', null, String(props.episodeTitle)),
      css: 'article { color: rebeccapurple; }',
      initialHeight: 240,
    }));
    const output = await renderEditorBlockModule(
      {
        default: providerRenderer,
      },
      {
        blockName: 'episode-player',
        props: { episodeTitle: 'Episode 12' },
      },
    );

    expect(output).toEqual({
      html: '<article data-block="episode-player"><strong>EPISODE 12</strong></article>',
      portableHtml: '<p>Episode 12</p>',
      css: 'article { color: rebeccapurple; }',
      initialHeight: 240,
    });
  });

  it('requires a static web component', async function () {
    const providerRenderer = defineEditorBlockRenderer(() => ({ content: null }));

    await expect(
      renderEditorBlockModule(
        {
          default: providerRenderer,
        },
        { blockName: 'empty', props: {} },
      ),
    ).rejects.toThrow('web content');
  });

  it('hydrates the saved markup with the same provider component when opted in', async function () {
    function Counter({ label }: { label: string }) {
      const [count, setCount] = useState(0);
      return h('button', { onClick: () => setCount((value) => value + 1) }, `${label}: ${count}`);
    }

    const providerRenderer = defineEditorBlockRenderer(
      ({ props }) => ({
        content: h(Counter, { label: String(props.label) }),
        css: 'button { color: green; }',
      }),
      { hydrate: true },
    );
    const output = await providerRenderer({ blockName: 'counter', props: { label: 'Clicks' } });
    const root = document.createElement('main');
    root.innerHTML = output.html;
    const style = document.createElement('style');
    style.dataset.ghostAddonContentStyle = '';
    style.textContent = 'button { color: red; }';
    document.head.append(style);
    document.body.append(root);
    const savedButton = root.firstElementChild;

    await providerRenderer.hydrate?.({ blockName: 'counter', props: { label: 'Clicks' } }, root);
    const button = root.querySelector('button')!;
    button.click();
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(button).toBe(savedButton);
    expect(button.textContent).toBe('Clicks: 1');
    expect(style.textContent).toBe('button { color: green; }');
    root.remove();
    style.remove();
  });
});
