import { afterEach, expect, it } from 'vitest';
import { page } from 'vitest/browser';

import { IframePreviewDocumentSurface } from './preview-document';
import type { PreviewLiveElementTarget } from './preview-inspection';
import type { BuilderSelectionContext } from '@/builder/core/workspace';

const surfaces: IframePreviewDocumentSurface[] = [];
const iframes: HTMLIFrameElement[] = [];
const signal = new AbortController().signal;
const marker = 'partials/card.hbs:2:1';
const html = `<h2 id="first" data-edit="${marker}">First card</h2>
<h2 id="second" data-edit="${marker}">Second card</h2>
<p data-edit="index.hbs:3:1">Unique literal</p><output id="status">Waiting</output>
<script>
let detached;
window.addEventListener('message', ({data}) => {
  if (data === 'navigate-away') location.href = 'about:blank';
  if (data === 'probe-zoom') document.dispatchEvent(new WheelEvent('wheel', { ctrlKey: true, deltaY: -80, clientX: 20, clientY: 30, cancelable: true }));
  if (data === 'reorder') document.body.prepend(document.getElementById('second'));
  if (data === 'remove') { detached = document.getElementById('second'); detached.remove(); }
  if (data === 'reinsert') document.body.append(detached);
  if (data === 'hide') document.getElementById('second').hidden = true;
  document.getElementById('status').textContent = data;
});
</script>`;

async function preview(canvasNavigation = true, delayedFonts = false) {
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:640px;height:480px;border:0';
  document.body.append(iframe);
  iframes.push(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation });
  surfaces.push(surface);
  const selections: BuilderSelectionContext[] = [];
  surface.onSelection((selection) => {
    if (selection) {
      selections.push(selection);
    }
  });
  const renderDocument = {
    html:
      html +
      (delayedFonts
        ? `<script>Object.defineProperty(document.fonts, 'ready', { value: new Promise(resolve => window.addEventListener('load', () => setTimeout(resolve, 300))) });</script>`
        : ''),
    revision: 'baseline',
    url: 'https://example.com/',
  };
  await surface.replaceDocument(renderDocument, null, signal);
  await surface.setInteractionMode('select', signal);
  const frame = page.frameLocator(page.elementLocator(iframe));
  const select = async (name: string) => {
    selections.length = 0;
    await frame.getByRole('heading', { name, exact: true }).click();
    await expect.poll(() => selections.at(-1)?.label).toBe(name);
    return selections.at(-1)!;
  };
  const mutate = async (action: string) => {
    iframe.contentWindow!.postMessage(action, '*');
    await expect
      .poll(async () => (await surface.inspectElement({ selector: '#status' }, signal)).text)
      .toBe(action);
  };
  return { surface, iframe, document: renderDocument, select, mutate };
}

function occurrence(selection: BuilderSelectionContext): PreviewLiveElementTarget {
  const handle = (selection.data as { occurrence?: unknown }).occurrence;
  expect(handle).toEqual(expect.any(String));
  return { occurrence: handle as string };
}

afterEach(() => {
  surfaces.splice(0).forEach((surface) => surface.destroy());
  iframes.splice(0).forEach((iframe) => iframe.remove());
});

it('inspects the clicked repeated occurrence and preserves its identity across reordering', async () => {
  const { surface, select, mutate } = await preview();
  const first = occurrence(await select('First card'));
  const secondSelection = await select('Second card');
  const second = occurrence(secondSelection);
  expect(second).not.toEqual(first);
  expect(secondSelection.data).toMatchObject({ marker, source: { path: 'partials/card.hbs' } });
  await expect(surface.inspectElement(second, signal)).resolves.toMatchObject({
    text: 'Second card',
  });
  await mutate('reorder');
  await expect(surface.inspectElement(second, signal)).resolves.toMatchObject({
    text: 'Second card',
  });
  expect(occurrence(await select('Second card'))).toEqual(second);
  await expect(surface.inspectElement(first, signal)).resolves.toMatchObject({
    text: 'First card',
  });
});

it('rejects ambiguous canvas markers instead of inspecting the first occurrence', async () => {
  const { surface } = await preview();
  await expect(surface.inspectElement({ marker }, signal)).rejects.toMatchObject({
    code: 'preview_target_ambiguous',
  });
  await expect(surface.inspectElement({ selector: '#second' }, signal)).resolves.toMatchObject({
    text: 'Second card',
  });
});

it('retires detached occurrence handles without retargeting a remaining or reinserted card', async () => {
  const { surface, select, mutate } = await preview();
  const target = occurrence(await select('Second card'));
  await mutate('remove');
  await expect(surface.inspectElement(target, signal)).rejects.toMatchObject({
    code: 'preview_occurrence_stale',
  });
  await mutate('reinsert');
  await expect(surface.inspectElement(target, signal)).rejects.toMatchObject({
    code: 'preview_occurrence_stale',
  });
  const fresh = occurrence(await select('Second card'));
  expect(fresh).not.toEqual(target);
  await expect(surface.inspectElement(fresh, signal)).resolves.toMatchObject({
    text: 'Second card',
  });
});

it('refuses old handles and marker-based restoration after document replacement', async () => {
  const { surface, select, document } = await preview();
  const selection = await select('Second card');
  const target = occurrence(selection);
  await expect(surface.replaceDocument(document, selection, signal)).resolves.toBeNull();
  await expect(surface.inspectElement(target, signal)).rejects.toMatchObject({
    code: 'preview_occurrence_stale',
  });
  expect(occurrence(await select('Second card'))).not.toEqual(target);
});

it('binds occurrence handles to their live surface and retains accessibility checks', async () => {
  const first = await preview();
  const target = occurrence(await first.select('Second card'));
  const other = await preview();
  await other.select('Second card');
  await expect(other.surface.inspectElement(target, signal)).rejects.toMatchObject({
    code: 'preview_occurrence_stale',
  });
  await first.mutate('hide');
  await expect(first.surface.inspectElement(target, signal)).rejects.toMatchObject({
    code: 'preview_element_inaccessible',
  });
});

it('preserves legacy marker selection, inspection and restoration', async () => {
  const { surface, select, document } = await preview(false);
  const selection = await select('Second card');
  expect(selection.id).toBe(marker);
  expect(selection.data).not.toHaveProperty('occurrence');
  await expect(surface.inspectElement({ marker }, signal)).resolves.toMatchObject({
    text: 'First card',
  });
  await expect(surface.replaceDocument(document, selection, signal)).resolves.toMatchObject({
    id: marker,
    label: 'First card',
  });
});

it('requires one bounded live target and still accepts unique canvas markers', async () => {
  const { surface } = await preview();
  await expect(surface.inspectElement({ marker: 'index.hbs:3:1' }, signal)).resolves.toMatchObject({
    text: 'Unique literal',
  });
  await expect(surface.inspectElement({ selector: '#status' }, signal)).resolves.toMatchObject({
    text: 'Waiting',
  });
  const invalid = [
    {},
    { occurrence: '' },
    { occurrence: 123 },
    { occurrence: 'handle', marker },
    { occurrence: 'handle', selector: '' },
  ];
  for (const target of invalid) {
    await expect(
      surface.inspectElement(target as PreviewLiveElementTarget, signal),
    ).rejects.toMatchObject({
      code: 'invalid_preview_target',
    });
  }
  await expect(
    surface.inspectElement({ occurrence: 'x'.repeat(513) }, signal),
  ).rejects.toMatchObject({
    code: 'preview_target_too_large',
  });
});

it('waits for initial canvas fonts before allowing bounded layout settling to start', async () => {
  const iframe = document.createElement('iframe');
  document.body.append(iframe);
  iframes.push(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: true });
  surfaces.push(surface);
  let loaded = false;
  let replaced = false;
  let failure: unknown = null;
  const receive = (event: MessageEvent) => {
    if (event.source === iframe.contentWindow && event.data === 'occurrence-font-load') {
      loaded = true;
    }
  };
  window.addEventListener('message', receive);
  const replacing = surface
    .replaceDocument(
      {
        html: `<h1>Font-dependent geometry</h1><script>
      let release;
      Object.defineProperty(document.fonts, 'ready', { value: new Promise(resolve => { release = resolve; }) });
      window.addEventListener('load', () => parent.postMessage('occurrence-font-load', '*'));
      window.addEventListener('message', ({data}) => { if(data === 'release-initial-fonts') release(); });
    </script>`,
        url: 'https://example.com/',
        revision: 'fonts',
      },
      null,
      signal,
    )
    .then(
      () => {
        replaced = true;
      },
      (error: unknown) => {
        failure = error;
      },
    );
  try {
    await expect.poll(() => loaded).toBe(true);
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 250);
    });
    expect(failure).toBeNull();
    expect(replaced).toBe(false);
    iframe.contentWindow!.postMessage('release-initial-fonts', '*');
    await replacing;
    expect(replaced).toBe(true);
  } finally {
    iframe.contentWindow!.postMessage('release-initial-fonts', '*');
    window.removeEventListener('message', receive);
    await replacing;
  }
});

it('recovers canvas mode after navigation rollback and retires handles from the old runtime', async () => {
  const { surface, iframe, select } = await preview(true, true);
  let zoomReceived = false;
  surface.onCanvasInput((input) => {
    if (input.kind === 'zoom') {
      zoomReceived = true;
    }
  });
  const target = occurrence(await select('Second card'));
  const original = await surface.measureLayout(signal);
  let restored = false;
  surface.onDiagnostic((diagnostic) => {
    if (diagnostic.code === 'preview_navigation_bypassed') {
      restored = true;
    }
  });
  iframe.contentWindow!.postMessage('navigate-away', '*');
  await expect.poll(() => restored).toBe(true);
  await expect
    .poll(async () => {
      try {
        return (await surface.inspectElement({ selector: '#second' }, signal)).text;
      } catch {
        return null;
      }
    })
    .toBe('Second card');
  const current = await surface.measureLayout(signal);
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 350);
  });
  expect(current.documentId).toBe(original.documentId);
  expect(current.documentInstanceId).not.toBe(original.documentInstanceId);
  await expect(surface.inspectElement(target, signal)).rejects.toMatchObject({
    code: 'preview_occurrence_stale',
  });
  const fresh = occurrence(await select('Second card'));
  expect(fresh).not.toEqual(target);
  await expect(surface.inspectElement(target, signal)).rejects.toMatchObject({
    code: 'preview_occurrence_stale',
  });
  await expect(surface.inspectElement(fresh, signal)).resolves.toMatchObject({
    text: 'Second card',
  });
  iframe.contentWindow!.postMessage('probe-zoom', '*');
  await expect.poll(() => zoomReceived).toBe(true);
});
