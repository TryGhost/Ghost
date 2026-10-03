import { expect, it } from 'vitest';
import { page } from 'vitest/browser';
import { TemplateEngine } from '@tryghost/theme-renderer';
import { getThemeLiteralTextTargets } from '@tryghost/theme-renderer/editor';
import { injectEditMarkers } from '@tryghost/theme-renderer/markers';
import { IframePreviewDocumentSurface } from '@/builder/workspaces/theme/preview/preview-document';

it.each([
  [
    'authored alias',
    '<h1>Literal heading</h1>\n<h1 data-edit="index.hbs:1:1">{{title}}</h1>',
    'Dynamic title',
  ],
  [
    'helper output alias',
    '<h1>Literal heading</h1>\n<section>{{{extra}}}</section>',
    'Dynamic title',
  ],
  [
    'SVG',
    '<svg width="300" height="120"><text x="20" y="60">Literal SVG text</text></svg>',
    'Literal SVG text',
  ],
  ['MathML', '<math><mtext>Literal math text</mtext></math>', 'Literal math text'],
])('keeps %s selectable without opening an unsafe editor', async (_, source, selectedText) => {
  const theme = { 'index.hbs': source };
  const editMarkerAttribute = `data-builder-source-${crypto.randomUUID()}`;
  const engine = new TemplateEngine(
    { resolve: (name) => theme[name as keyof typeof theme], list: () => Object.keys(theme) },
    {
      onCompile(self, text, file) {
        return self.handlebars.compile(injectEditMarkers(text, file!, editMarkerAttribute), {
          preventIndent: true,
        });
      },
    },
  );
  const html = await engine.render('index.hbs', {
    title: 'Dynamic title',
    extra: '<h1 data-edit="index.hbs:1:1">Dynamic title</h1>',
  });
  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'width:600px;height:600px;border:0';
  document.body.appendChild(iframe);
  const surface = new IframePreviewDocumentSurface(iframe, { canvasNavigation: true });
  const signal = new AbortController().signal;
  const selections: unknown[] = [];
  surface.onSelection((value) => {
    if (value) {
      selections.push(value);
    }
  });
  try {
    await surface.setInlineEditMode(true, signal);
    await surface.replaceDocument(
      {
        html,
        url: 'https://example.com/',
        revision: 'admission-1',
        editMarkerAttribute,
        inlineTextTargets: getThemeLiteralTextTargets(theme, editMarkerAttribute),
      },
      null,
      signal,
    );
    await page
      .frameLocator(page.elementLocator(iframe))
      .getByText(selectedText, { exact: true })
      .dblClick();
    expect((await surface.measureLayout(signal)).localEdits.active).toBe(false);
    expect(selections.length).toBeGreaterThan(0);
    expect((await surface.inspectPage('https://example.com/', signal)).text).toContain(
      selectedText,
    );
    if (_ === 'authored alias') {
      expect(JSON.stringify(selections.at(-1))).toContain('index.hbs:2:1');
    }
  } finally {
    surface.destroy();
    iframe.remove();
  }
});
