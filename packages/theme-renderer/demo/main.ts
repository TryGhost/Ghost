/**
 * THROWAWAY slice-3 demo harness (see README.md in this directory).
 *
 * Renders Casper's home route WITH data-edit markers inside a real Web Worker
 * (reusing the browser-test worker entry and recorded fixtures), shows it in
 * an iframe, and wires the editor loop by hand: hover outlines marked
 * elements, click → {file, line, column} → prompt → applyThemeTextEdit →
 * fresh renderer in the worker → iframe updates.
 *
 * Not part of the package build, lint, tests, or CI. Run: pnpm exec vite demo
 */
import { EDIT_MARKER_ATTRIBUTE, parseEditMarker } from '../src/engine/markers.ts';
import { applyThemeTextEdit } from '../src/editor/text-edit.ts';
import type { WorkerRenderRequest, WorkerRenderResult } from '../test/browser/render-worker.ts';
import instance from '../test/browser/fixtures/instance.json';
import themeJson from '../test/browser/fixtures/casper-theme.json';
import apiFixtures from '../test/browser/fixtures/content-api.json';

const statusEl = document.getElementById('status')!;
const frame = document.getElementById('preview') as HTMLIFrameElement;

let theme = { ...(themeJson as Record<string, string>) };
let rendering = false;

// One worker; each posted message builds a FRESH renderer inside it — the
// slice-3 supported path (a live renderer's caches don't see theme edits).
const worker = new Worker(new URL('../test/browser/render-worker.ts', import.meta.url), {
  type: 'module',
});

function setStatus(text: string): void {
  statusEl.textContent = text;
}

function postRender(): Promise<WorkerRenderResult> {
  return new Promise((resolve, reject) => {
    worker.onmessage = (event: MessageEvent<WorkerRenderResult>) => resolve(event.data);
    // a crashed worker (e.g. failed module load) must reject, not hang —
    // render()'s finally clears the `rendering` latch either way
    worker.onerror = (event) =>
      reject(new Error(`worker crashed: ${event.message || 'unknown error'}`));
    const request: WorkerRenderRequest = {
      siteUrl: instance.siteUrl,
      contentApiKey: instance.contentApiKey,
      theme,
      config: instance.config,
      apiFixtures: apiFixtures as WorkerRenderRequest['apiFixtures'],
      path: instance.routes.home,
      markers: true,
    };
    worker.postMessage(request);
  });
}

/**
 * Display-only tweaks to the rendered HTML: a <base> so theme assets resolve
 * against the recorded site URL (styles appear when a local Ghost dev
 * instance is running there; unstyled otherwise — fine for the spike), and
 * the hover outline for marked elements. String surgery kept dead-simple:
 * prepend to the <head> content.
 */
function injectDemoHead(html: string): string {
  const inject =
    `<base href="${instance.siteUrl}"><style>` +
    `[${EDIT_MARKER_ATTRIBUTE}]:hover{outline:2px solid #f43f5e;outline-offset:2px;cursor:pointer}` +
    '</style>';
  const headEnd = html.search(/<head[^>]*>/i);
  if (headEnd === -1) {
    return inject + html;
  }
  const openTagEnd = html.indexOf('>', headEnd) + 1;
  return html.slice(0, openTagEnd) + inject + html.slice(openTagEnd);
}

async function render(reason: string): Promise<void> {
  if (rendering) {
    return;
  }
  rendering = true;
  setStatus(`${reason} — rendering in worker…`);
  const started = performance.now();
  try {
    const result = await postRender();
    const ms = Math.round(performance.now() - started);
    if (!result.ok) {
      setStatus(`render failed after ${ms}ms — see console`);
      console.error(result.error); // eslint-disable-line no-console
      return;
    }
    frame.srcdoc = injectDemoHead(result.html);
    setStatus(
      `${reason} — fresh renderer + render: ${ms}ms. Hover to outline marked elements; click one to edit its text.`,
    );
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error));
    console.error(error); // eslint-disable-line no-console
  } finally {
    rendering = false;
  }
}

frame.addEventListener('load', () => {
  const doc = frame.contentDocument;
  if (!doc) {
    return;
  }
  doc.addEventListener(
    'click',
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      // no instanceof Element: the target lives in the iframe's realm,
      // whose Element constructor differs from this page's
      const node = event.target as Node | null;
      const origin = node?.nodeType === Node.ELEMENT_NODE ? (node as Element) : null;
      const target = origin?.closest(`[${EDIT_MARKER_ATTRIBUTE}]`);
      if (!target) {
        setStatus(
          'Not editable here: no data-edit ancestor (helper-emitted or punted HTML — see docs/markers.md).',
        );
        return;
      }
      const value = target.getAttribute(EDIT_MARKER_ATTRIBUTE)!;
      const marker = parseEditMarker(value);
      if (!marker) {
        setStatus(`unparseable marker: ${value}`);
        return;
      }
      const tag = target.tagName.toLowerCase();
      setStatus(`clicked <${tag}> → ${marker.file}:${marker.line}:${marker.column}`);
      const replacement = window.prompt(
        `Replace the text of <${tag}> at ${marker.file}:${marker.line}:${marker.column} with:`,
        target.textContent?.trim() ?? '',
      );
      if (replacement === null) {
        return;
      }
      try {
        // anchor: the clicked element's tag name guards against stale markers
        theme = applyThemeTextEdit(theme, marker, replacement, { tagName: target.tagName });
      } catch (error) {
        window.alert(error instanceof Error ? error.message : String(error));
        return;
      }
      void render(`edited ${marker.file}:${marker.line}:${marker.column}`);
    },
    true,
  );
});

void render('initial marked render (recorded Casper fixtures)');
