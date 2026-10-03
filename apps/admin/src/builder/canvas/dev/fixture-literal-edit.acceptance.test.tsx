import { expect, it } from 'vitest';
import { page, userEvent } from 'vitest/browser';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';
import { DEFAULT_CANVAS_ROUTING_SOURCE } from '@/builder/canvas/route-compatibility';
import { instance, loadAssets } from './fixture';
import type { ThemeFixtureId } from './fixture';
import type { BuilderSelectionContext } from '@/builder/core/workspace';

type Render = {
  html: Record<string, string>;
  revision: string;
  inlineTextTargets: Record<string, string>;
  editMarkerAttribute: string;
  error?: string;
};
function renderer(fixtureId: ThemeFixtureId) {
  const worker = new Worker(new URL('./fixture.worker.ts', import.meta.url), { type: 'module' });
  return {
    worker,
    render: (edit?: {
      marker: string;
      tagName: string;
      newText: string;
      expectedRevision: string;
    }) =>
      new Promise<Render>((resolve, reject) => {
        worker.onmessage = (event: MessageEvent<Render>) =>
          event.data.error ? reject(new Error(event.data.error)) : resolve(event.data);
        worker.onerror = (event) => reject(new Error(event.message));
        worker.postMessage({ fixtureId, edit, routingYaml: DEFAULT_CANVAS_ROUTING_SOURCE });
      }),
  };
}

it.each(['source', 'casper'] as const)(
  'inspects the selected repeated %s Home card without falling back to its first use',
  async (fixtureId) => {
    const client = renderer(fixtureId);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: true });
    const signal = new AbortController().signal;
    let selected: BuilderSelectionContext | null = null;
    surface.onSelection((value) => {
      selected = value;
    });
    try {
      const rendered = await client.render();
      await surface.replaceDocument(
        {
          html: rendered.html.home,
          revision: rendered.revision,
          inlineTextTargets: rendered.inlineTextTargets,
          editMarkerAttribute: rendered.editMarkerAttribute,
          url: instance.siteUrl,
          assets: await loadAssets(fixtureId),
        },
        null,
        signal,
      );
      await surface.setInteractionMode('select', signal);
      const outline = (await surface.inspectPage(instance.siteUrl, signal)).outline;
      const cards = outline.filter(
        (item) => item.source?.path === 'partials/post-card.hbs' && item.role === 'heading',
      );
      expect(cards.length).toBeGreaterThan(1);
      const frame = page.frameLocator(page.elementLocator(iframe));
      await frame.getByRole('heading', { name: cards[0].name, exact: true }).click();
      await expect.poll(() => selected?.label).toBe(cards[0].name);
      const first = selected!.data as { marker: string; occurrence: string };
      await frame.getByRole('heading', { name: cards[1].name, exact: true }).click();
      await expect.poll(() => selected?.label).toBe(cards[1].name);
      const second = selected!.data as { marker: string; occurrence: string };
      expect(second.marker).toBe(first.marker);
      expect(second.occurrence).not.toBe(first.occurrence);
      await expect(
        surface.inspectElement({ occurrence: second.occurrence }, signal),
      ).resolves.toMatchObject({
        text: cards[1].name,
      });
      await expect(surface.inspectElement({ marker: second.marker }, signal)).rejects.toMatchObject(
        {
          code: 'preview_target_ambiguous',
        },
      );
      expect((await surface.measureLayout(signal)).localEdits.active).toBe(false);
    } finally {
      surface.destroy();
      iframe.remove();
      client.worker.terminate();
    }
  },
);

it.each(['source', 'casper'] as const)(
  'keeps %s dynamic Post output selectable without opening a literal editor',
  async (fixtureId) => {
    const client = renderer(fixtureId);
    const iframe = document.createElement('iframe');
    iframe.style.cssText = 'width:390px;height:844px;border:0';
    document.body.appendChild(iframe);
    const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: true });
    const signal = new AbortController().signal;
    const selection: string[] = [];
    surface.onSelection((value) => {
      if (value) {
        selection.push(value.id);
      }
    });
    try {
      const rendered = await client.render();
      await surface.setInlineEditMode(true, signal);
      await surface.replaceDocument(
        {
          html: rendered.html.post,
          revision: rendered.revision ?? 'baseline',
          inlineTextTargets: rendered.inlineTextTargets,
          editMarkerAttribute: rendered.editMarkerAttribute,
          url: new URL(instance.routes.post, instance.siteUrl).href,
          assets: await loadAssets(fixtureId),
        },
        null,
        signal,
      );
      const frame = page.frameLocator(page.elementLocator(iframe));
      const titleText = (
        await surface.inspectElement(
          { selector: fixtureId === 'source' ? '.gh-article-title' : '.article-title' },
          signal,
        )
      ).text;
      const title = frame.getByRole('heading', { name: titleText, exact: true });
      await title.dblClick();
      await expect
        .poll(async () => (await surface.measureLayout(signal)).localEdits.active)
        .toBe(false);
      expect(selection.length).toBeGreaterThan(0);
      expect((await surface.inspectPage(instance.siteUrl, signal)).text).toContain('literal');
    } finally {
      surface.destroy();
      iframe.remove();
      client.worker.terminate();
    }
  },
);

it.each(['source', 'casper'] as const)(
  'applies a real %s footer source edit to Home/Post at both device widths',
  async (fixtureId) => {
    const client = renderer(fixtureId);
    const surfaces: IframePreviewDocumentSurface[] = [];
    const iframes: HTMLIFrameElement[] = [];
    const signal = new AbortController().signal;
    try {
      const first = await client.render();
      const assets = await loadAssets(fixtureId);
      for (const [group, width, height] of [
        ['home', 1440, 900],
        ['home', 390, 844],
        ['post', 1440, 900],
        ['post', 390, 844],
      ] as const) {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = `width:${width}px;height:${height}px;border:0`;
        document.body.appendChild(iframe);
        iframes.push(iframe);
        const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: true });
        surfaces.push(surface);
        await surface.replaceDocument(
          {
            html: first.html[group],
            revision: first.revision ?? 'baseline',
            inlineTextTargets: first.inlineTextTargets,
            editMarkerAttribute: first.editMarkerAttribute,
            url: new URL(instance.routes[group], instance.siteUrl).href,
            assets,
          },
          null,
          signal,
        );
      }
      let accepted: Render | undefined;
      surfaces[1].onInlineEdit(async (edit) => {
        if (edit.kind !== 'text') {
          return { ok: false, message: 'Text only.' };
        }
        accepted = await client.render({ ...edit, expectedRevision: first.revision });
        return { ok: true };
      });
      await surfaces[1].setInlineEditMode(true, signal);
      const frame = page.frameLocator(page.elementLocator(iframes[1]));
      await frame
        .getByRole('link', {
          name: fixtureId === 'source' ? 'Ghost' : 'Powered by Ghost',
          exact: true,
        })
        .dblClick();
      await frame.getByRole('textbox', { name: /^Edit / }).fill('Fixture source was changed');
      await userEvent.keyboard('{Enter}');
      await expect.poll(() => Boolean(accepted && accepted.revision !== first.revision)).toBe(true);
      for (let index = 0; index < surfaces.length; index += 1) {
        const group = index < 2 ? 'home' : 'post';
        await surfaces[index].replaceDocument(
          {
            html: accepted!.html[group],
            revision: accepted!.revision,
            inlineTextTargets: accepted!.inlineTextTargets,
            editMarkerAttribute: accepted!.editMarkerAttribute,
            url: new URL(instance.routes[group], instance.siteUrl).href,
            assets,
          },
          null,
          signal,
        );
        expect(
          (
            await surfaces[index].inspectElement(
              { selector: 'a[href="https://ghost.org/"]' },
              signal,
            )
          ).text,
        ).toBe('Fixture source was changed');
        expect((await surfaces[index].measureLayout(signal)).viewport).toMatchObject({
          width: index % 2 ? 390 : 1440,
          height: index % 2 ? 844 : 900,
        });
      }
    } finally {
      surfaces.forEach((surface) => surface.destroy());
      iframes.forEach((iframe) => iframe.remove());
      client.worker.terminate();
    }
  },
);
