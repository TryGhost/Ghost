import JSZip from 'jszip';
import { act } from 'react';
import { describe, expect, it } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import {
  activeThemeResponse,
  currentRoute,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeSettingsScreens,
  fakeSitePreview,
  renderAdminApp,
  siteResponse,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';
import defaultRoutes from '../../../../ghost/core/core/server/services/route-settings/default-routes.yaml?raw';
import type { CanvasProbe, ReadResult } from '@/builder/canvas/canvas-probe';

const liveHtml =
  '<html><head><link rel="stylesheet" href="/assets/built/screen.css?v=abc123"><script defer src="/ghost/assets/portal.js" data-i18n="true" data-key="0123456789abcdef"></script><script defer src="/ghost/assets/search.js" data-key="0123456789abcdef" data-styles="/ghost/assets/search.css" data-sodo-search="true"></script></head><body>Live site</body></html>';

const yamlResponse = (source: string) =>
  new Response(source, { headers: { 'Content-Type': 'application/yaml' } });

async function fakeBuilderWorld({ post = false } = {}): Promise<void> {
  const theme = activeThemeResponse().themes[0];
  if (!theme) {
    throw new Error('The active theme fixture is missing.');
  }
  fakeAdminEndpoint('GET', '/themes/', { themes: [theme] });
  const archive = await new JSZip()
    .file('casper/package.json', JSON.stringify({ name: 'casper', version: '1.0.0' }))
    .file(
      'casper/index.hbs',
      '<!doctype html><html><head><title>{{@site.title}}</title></head><body><main data-edit="casper/index.hbs:1:1"><h1>{{@site.title}}</h1>{{> footer}}</main></body></html>',
    )
    .file('casper/partials/footer.hbs', '<a href="/">Canvas footer</a>')
    .file(
      'casper/post.hbs',
      '<html><body>{{#post}}<h1>{{title}}</h1>{{/post}}{{> footer}}</body></html>',
    )
    .generateAsync({ type: 'arraybuffer' });
  fakeAdminEndpoint('GET', '/custom_theme_settings/', { custom_theme_settings: [] });
  fakeAdminEndpoint('GET', '/settings/routes/yaml/', yamlResponse(defaultRoutes), {
    contentType: 'application/yaml',
  });
  fakeAdminEndpoint('GET', `/themes/${theme.name}/download/`, archive, {
    contentType: 'application/zip',
  });
  const siteUrl = siteResponse().site.url;
  if (typeof siteUrl !== 'string') {
    throw new Error('The site fixture URL is missing.');
  }
  fakeSitePreview(siteUrl, liveHtml);
  fakeEndpoint('GET', `${new URL('/ghost/api/content/settings/', siteUrl).href}*`, {
    settings: {
      title: 'Rendered site',
      description: 'Builder acceptance fixture',
      navigation: [{ label: 'Home', url: '/' }],
      secondary_navigation: [],
      labs: {},
      url: siteUrl,
      version: '6.0',
    },
  });
  fakeEndpoint('GET', `${new URL('/ghost/api/content/posts/', siteUrl).href}*`, {
    posts: post
      ? [
          {
            id: 'published-post',
            slug: 'published-post',
            url: new URL('published-post/', siteUrl).href,
            title: 'Published canvas example',
            visibility: 'public',
            html: '<p>Real post content</p>',
            tags: [],
            authors: [],
          },
        ]
      : [],
    meta: { pagination: { page: 1, limit: 15, pages: 1, total: 0, next: null, prev: null } },
  });
}

describe('Design Builder route', () => {
  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'keeps typed text through agent replacement and recovers a conflicting draft',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const ready = async () => {
        await expect
          .poll(
            async () => {
              const state = await commands.canvasNativeTool(
                'ghost_canvas_probe_get_editor_state',
                {},
              );
              const editor = (state.data as { editor?: { busy?: boolean } } | undefined)?.editor;
              return (
                editor?.busy === false &&
                document.querySelectorAll('iframe[data-preview-status="Ready"]').length === 8
              );
            },
            { timeout: 30_000 },
          )
          .toBe(true);
      };
      const change = async (path: string, content: string) => {
        const state = await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {});
        expect(state.status).toBe('ok');
        const data = state.data as { workspaceId: string; editor: { sourceRevision: string } };
        const result = await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
          workspaceId: data.workspaceId,
          expectedRevision: data.editor.sourceRevision,
          expectedDataGeneration: 0,
          files: [{ operation: 'write', path, content }],
        });
        expect(result).toMatchObject({ status: 'ok', data: { accepted: true } });
        await ready();
      };
      try {
        await ready();
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        const iframes = [
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ];
        const camera = page.getByTestId('canvas-world').element().getAttribute('style');
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).dblClick();
        await frame.getByRole('textbox', { name: /^Edit / }).fill('Manual footer draft');
        await change('index.hbs', '<html><body><h1>Agent design</h1>{{> footer}}</body></html>');
        expect(iframes).toEqual([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]);
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        await page.getByRole('button', { name: 'Resume text draft' }).click();
        await frame.getByRole('textbox', { name: /^Edit / }).click();
        await userEvent.keyboard('{Enter}');
        await ready();
        await frame.getByRole('link', { name: 'Manual footer draft', exact: true }).hover();
        expect(
          iframes.every((iframe) =>
            (iframe as HTMLIFrameElement).srcdoc.includes('Manual footer draft'),
          ),
        ).toBe(true);
        await page.getByRole('button', { name: 'Undo theme change', exact: true }).click();
        await ready();
        await frame.getByRole('heading', { name: 'Agent design' }).hover();
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).dblClick();
        await frame.getByRole('textbox', { name: /^Edit / }).fill('Preserve conflicting text');
        await change('partials/footer.hbs', '<a href="/">Agent footer replacement</a>');
        await expect
          .element(page.getByRole('button', { name: 'Resume text draft' }))
          .toBeDisabled();
        await page.getByRole('button', { name: 'Recover text draft' }).click();
        await expect
          .element(page.getByRole('textbox', { name: 'Preserved text draft' }))
          .toHaveValue('Preserve conflicting text');
        await expect.element(page.getByRole('button', { name: 'Copy draft text' })).toBeVisible();
        await page.getByRole('button', { name: 'Cancel text draft' }).click();
        await frame.getByRole('link', { name: 'Agent footer replacement', exact: true }).hover();
        await frame.getByRole('link', { name: 'Agent footer replacement', exact: true }).dblClick();
        await frame.getByRole('textbox', { name: /^Edit / }).fill('x'.repeat(65537));
        const state = await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {});
        const data = state.data as { workspaceId: string; editor: { sourceRevision: string } };
        expect(
          await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
            workspaceId: data.workspaceId,
            expectedRevision: data.editor.sourceRevision,
            expectedDataGeneration: 0,
            files: [
              {
                operation: 'write',
                path: 'partials/footer.hbs',
                content: '<a href="/">Accepted agent footer</a>',
              },
            ],
          }),
        ).toMatchObject({ status: 'ok', data: { accepted: true } });
        expect(
          await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {}),
        ).toMatchObject({
          data: {
            editor: {
              busy: true,
              manualDraft: {
                captureFailed: true,
                textObservation: 'unavailable-copy-from-preview',
              },
            },
          },
        });
        expect(
          iframes.every(
            (iframe) => !(iframe as HTMLIFrameElement).srcdoc.includes('Accepted agent footer'),
          ),
        ).toBe(true);
        await page.getByRole('button', { name: 'Recover text draft' }).click();
        await expect
          .element(page.getByRole('textbox', { name: 'Preserved text draft' }))
          .not.toBeInTheDocument();
        await expect
          .element(page.getByRole('button', { name: 'Copy draft text' }))
          .not.toBeInTheDocument();
        await page.getByRole('button', { name: 'Cancel text draft' }).click();
        await ready();
        await frame.getByRole('link', { name: 'Accepted agent footer', exact: true }).hover();
      } finally {
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
    },
  );
  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'drives the real editor through native WebMCP reads, atomic patches and responsive captures',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () => {
        const result = (await commands.canvasNativeTool(
          'ghost_canvas_probe_get_editor_state',
          {},
        )) as ReadResult;
        expect(result.status).toBe('ok');
        if (result.status !== 'ok') {
          throw new Error(result.message);
        }
        return result.data as ReturnType<CanvasProbe['state']>;
      };
      const ready = () =>
        expect
          .poll(
            async () => {
              const current = await state();
              return (
                !current.editor?.busy &&
                current.frames.every(
                  (descriptor) =>
                    descriptor.device?.status === 'current' &&
                    descriptor.device.revision === current.editor?.sourceRevision,
                )
              );
            },
            { timeout: 30_000 },
          )
          .toBe(true);
      try {
        await expect
          .poll(() => commands.canvasNativeTools())
          .toContain('ghost_canvas_apply_theme_patch');
        await ready();
        const iframeElements = [
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ];
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const compositionFrame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        await compositionFrame.getByRole('link', { name: 'Canvas footer', exact: true }).click();
        const initial = await state();
        expect(initial.fixture).toBe(false);
        expect(initial.capabilities).toMatchObject({ mutations: true, themeReads: true });
        expect(initial.editor).toMatchObject({ selection: { frameId: 'home-mobile' } });
        const address = {
          workspaceId: initial.workspaceId,
          expectedRevision: initial.editor!.sourceRevision,
        };
        const source = await commands.canvasNativeTool('ghost_canvas_read_theme', {
          ...address,
          operation: 'read_file',
          path: 'partials/footer.hbs',
        });
        expect(JSON.stringify(source)).toContain('Canvas footer');
        expect(JSON.stringify(source)).not.toContain('0123456789abcdef');
        const camera = page.getByTestId('canvas-world').element().getAttribute('style');
        const rejected = await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
          ...address,
          expectedDataGeneration: 0,
          files: [
            {
              operation: 'write',
              path: 'post.hbs',
              content: '{{#post}}{{unknown-canvas-helper title}}{{/post}}',
            },
          ],
        });
        expect(rejected.status).toBe('error');
        expect(rejected.details).toBeDefined();
        expect((await state()).editor!.sourceRevision).toBe(address.expectedRevision);
        const result = await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
          ...address,
          expectedDataGeneration: 0,
          files: [
            {
              operation: 'write',
              path: 'partials/footer.hbs',
              content: '<a href="/">Agent canvas footer</a>',
            },
          ],
          settings: { 'global.accent_color': '#654321' },
        });
        expect(result).toMatchObject({
          status: 'ok',
          data: { accepted: true, delivery: 'pending' },
        });
        const pendingDelivery = await state();
        if (pendingDelivery.frames.some((descriptor) => descriptor.device?.status !== 'current')) {
          expect(pendingDelivery.editor?.busy).toBe(true);
        }
        await ready();
        await expect
          .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length)
          .toBe(8);
        expect([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]).toEqual(iframeElements);
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        const current = await state();
        expect(current.editor!.sourceRevision).not.toBe(address.expectedRevision);
        expect(
          [
            ...document.querySelectorAll<HTMLIFrameElement>(
              'iframe[title$="composition"],iframe[title$="preview"]',
            ),
          ].every((iframe) => iframe.srcdoc.includes('Agent canvas footer')),
        ).toBe(true);
        expect(
          await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
            ...address,
            expectedDataGeneration: 0,
            settings: { 'global.accent_color': '#abcdef' },
          }),
        ).toMatchObject({ code: 'stale_revision' });
        for (const frameId of ['home-desktop', 'home-mobile']) {
          const descriptor = current.frames.find((frame) => frame.id === frameId)!;
          const device = descriptor.device!;
          const target = {
            workspaceId: current.workspaceId,
            frameHandle: descriptor.frameHandle,
            representationHandle: device.representationHandle,
            expectedRevision: device.revision,
            expectedRenderKey: device.renderKey,
          };
          const inspected = await commands.canvasNativeTool(
            'ghost_canvas_probe_inspect_frame',
            target,
          );
          expect(inspected.status).toBe('ok');
          expect(JSON.stringify(inspected)).toContain('Agent canvas footer');
          const captured = await commands.canvasNativeTool('ghost_canvas_probe_capture_frame', {
            ...target,
            kind: 'viewport',
          });
          expect(captured.status).toBe('ok');
          expect(captured).toMatchObject({
            data: { image: { width: descriptor.width, height: descriptor.height } },
          });
          expect(JSON.stringify(captured)).toContain('data:image/png;base64,');
        }
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        await expect.element(page.getByRole('button', { name: 'Publish changes' })).toBeEnabled();
        expect(document.querySelector('[data-canvas-diagnostics]')).toBeNull();
        await page.getByRole('button', { name: 'Undo theme change', exact: true }).click();
        await ready();
        const undone = await state();
        expect(undone.editor!.sourceRevision).toBe(initial.editor!.sourceRevision);
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        expect(
          [
            ...document.querySelectorAll<HTMLIFrameElement>(
              'iframe[title$="composition"],iframe[title$="preview"]',
            ),
          ].every(
            (iframe) =>
              iframe.srcdoc.includes('Canvas footer') &&
              !iframe.srcdoc.includes('Agent canvas footer'),
          ),
        ).toBe(true);
        await expect
          .element(page.getByRole('button', { name: 'Undo theme change', exact: true }))
          .toBeDisabled();
        await expect
          .element(page.getByRole('button', { name: 'Redo theme change', exact: true }))
          .toBeEnabled();
        const historyResult = await commands.canvasNativeTool('ghost_canvas_history', {
          workspaceId: undone.workspaceId,
          expectedRevision: undone.editor!.sourceRevision,
          operation: 'list',
        });
        expect(historyResult.status).toBe('ok');
        expect(JSON.stringify(historyResult)).not.toContain('0123456789abcdef');
        const history = (historyResult.data as { history: { redoId: string } }).history;
        const redone = await commands.canvasNativeTool('ghost_canvas_history', {
          workspaceId: undone.workspaceId,
          expectedRevision: undone.editor!.sourceRevision,
          expectedDataGeneration: 0,
          operation: 'restore',
          checkpointId: history.redoId,
        });
        expect(redone).toMatchObject({
          status: 'ok',
          data: { accepted: true, revision: current.editor!.sourceRevision },
        });
        await ready();
        expect([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]).toEqual(iframeElements);
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        await expect
          .element(page.getByRole('button', { name: 'Redo theme change', exact: true }))
          .toBeDisabled();
      } finally {
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
      await expect
        .poll(() => commands.canvasNativeTools())
        .not.toContain('ghost_canvas_apply_theme_patch');
    },
  );
  it(
    'edits the active theme on eight live canvas documents without embedded chat',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      try {
        await expect.element(page.getByRole('region', { name: 'Theme canvas' })).toBeVisible();
        await expect
          .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
            timeout: 30_000,
          })
          .toBe(8);
        await expect
          .element(page.getByRole('textbox', { name: 'Describe a change' }))
          .not.toBeInTheDocument();
        await expect
          .element(page.getByRole('button', { name: /Connect.*(OpenAI|Anthropic)/ }))
          .not.toBeInTheDocument();
        const iframes = [
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ];
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const world = page.getByTestId('canvas-world').element();
        const view = world.getAttribute('style');
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        const footer = frame.getByRole('link', { name: 'Canvas footer', exact: true });
        await footer.hover();
        await footer.dblClick();
        const editor = frame.getByRole('textbox', { name: /^Edit / });
        await editor.fill('Updated shared canvas footer');
        await userEvent.keyboard('{Enter}');
        await expect
          .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
            timeout: 30_000,
          })
          .toBe(8);
        await expect
          .poll(() =>
            [
              ...document.querySelectorAll<HTMLIFrameElement>(
                'iframe[title$="composition"],iframe[title$="preview"]',
              ),
            ].every((iframe) => iframe.srcdoc.includes('Updated shared canvas footer')),
          )
          .toBe(true);
        await frame
          .getByRole('link', { name: 'Updated shared canvas footer', exact: true })
          .hover();
        expect([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]).toEqual(iframes);
        expect(world.getAttribute('style')).toBe(view);
        await page.getByRole('button', { name: 'Undo theme change', exact: true }).click();
        await expect
          .poll(() =>
            [
              ...document.querySelectorAll<HTMLIFrameElement>(
                'iframe[title$="composition"],iframe[title$="preview"]',
              ),
            ].every(
              (iframe) =>
                iframe.srcdoc.includes('Canvas footer') &&
                !iframe.srcdoc.includes('Updated shared canvas footer'),
            ),
          )
          .toBe(true);
        await expect
          .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
            timeout: 30_000,
          })
          .toBe(8);
        await expect.element(page.getByRole('button', { name: 'Publish changes' })).toBeDisabled();
        await expect
          .element(page.getByRole('button', { name: 'Undo theme change', exact: true }))
          .toBeDisabled();
        expect(world.getAttribute('style')).toBe(view);
        await page.getByRole('button', { name: 'Redo theme change', exact: true }).click();
        await expect
          .poll(() =>
            [
              ...document.querySelectorAll<HTMLIFrameElement>(
                'iframe[title$="composition"],iframe[title$="preview"]',
              ),
            ].every((iframe) => iframe.srcdoc.includes('Updated shared canvas footer')),
          )
          .toBe(true);
        await expect
          .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
            timeout: 30_000,
          })
          .toBe(8);
        expect([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]).toEqual(iframes);
        expect(world.getAttribute('style')).toBe(view);
        await expect.element(page.getByRole('button', { name: 'Publish changes' })).toBeEnabled();
      } finally {
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
    },
  );
  it(
    'shows the live Home canvas and unavailable Post frames on an empty site',
    { timeout: 45_000 },
    async () => {
      await fakeBuilderWorld();
      await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      await expect
        .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
          timeout: 30_000,
        })
        .toBe(4);
      await expect.element(page.getByText('No published Post is available.').first()).toBeVisible();
      await expect
        .element(page.getByRole('textbox', { name: 'Describe a change' }))
        .not.toBeInTheDocument();
    },
  );
  it('verifies installed routing again on entry even while the default configuration is cached', async () => {
    fakeSettingsScreens();
    await fakeBuilderWorld();
    await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
    await expect
      .element(page.getByTitle('Home · Mobile composition', { exact: true }))
      .toHaveAttribute('srcdoc');
    await page.getByRole('link', { name: 'Back to Design settings' }).click();
    await expect.element(settingsScreen.design()).toBeVisible();

    let release!: (response: Response) => void;
    const response = new Promise<Response>((resolve) => {
      release = resolve;
    });
    const routing = fakeAdminEndpoint('GET', '/settings/routes/yaml/', () => response);
    try {
      window.location.hash = '#/builder/theme';
      await expect.poll(() => routing.requests.length).toBe(1);
      await expect.element(page.getByText('Loading the active theme…')).toBeVisible();
      await expect
        .element(page.getByTitle('Home · Mobile composition', { exact: true }))
        .not.toBeInTheDocument();
    } finally {
      release(yamlResponse(defaultRoutes.replace('/{slug}/', '/news/{slug}/')));
    }
    await expect.element(page.getByRole('alert')).toHaveTextContent('custom routing');
    await expect
      .element(page.getByTitle('Home · Mobile composition', { exact: true }))
      .not.toBeInTheDocument();
  });

  it(
    'retains the live canvas and manual text draft when unrelated routing cache updates arrive',
    { timeout: 45_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld();
      const { queryClient } = await renderAdminApp('/builder/theme', {
        labs: { designBuilder: true },
      });
      try {
        await expect
          .poll(() => document.querySelectorAll('iframe[data-preview-status="Ready"]').length, {
            timeout: 30_000,
          })
          .toBe(4);
        const iframe = page.getByTitle('Home · Mobile composition', { exact: true }).element();
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).dblClick();
        await frame.getByRole('textbox', { name: /^Edit / }).fill('Keep this manual design draft');
        await act(async () => {
          queryClient.setQueriesData(
            { queryKey: ['RoutesConfiguration'] },
            defaultRoutes.replace('/{slug}/', '/news/{slug}/'),
          );
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 0);
          });
        });
        expect(page.getByTitle('Home · Mobile composition', { exact: true }).element()).toBe(
          iframe,
        );
        expect(iframe.isConnected).toBe(true);
        await expect.element(page.getByRole('button', { name: 'Resume text draft' })).toBeVisible();
        await userEvent.keyboard('{Enter}');
        await expect
          .poll(() =>
            (iframe as HTMLIFrameElement).srcdoc.includes('Keep this manual design draft'),
          )
          .toBe(true);
      } finally {
        await commands.canvasPointerViewport(false);
      }
    },
  );

  it('blocks a custom-routed site before rendering the default-route preview and keeps existing preview access', async () => {
    await fakeBuilderWorld();
    fakeAdminEndpoint(
      'GET',
      '/settings/routes/yaml/',
      yamlResponse(defaultRoutes.replace('/{slug}/', '/news/{slug}/')),
      { contentType: 'application/yaml' },
    );
    await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
    await expect.element(page.getByRole('alert')).toHaveTextContent('custom routing');
    await expect
      .element(page.getByRole('link', { name: 'Open site preview', exact: true }))
      .toHaveAttribute('href', siteResponse().site.url);
    await expect
      .element(page.getByTitle('Home · Mobile composition', { exact: true }))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole('textbox', { name: 'Describe a change' }))
      .not.toBeInTheDocument();
  });

  it('does not infer default routing when the backend cannot return its configuration', async () => {
    await fakeBuilderWorld();
    fakeAdminEndpoint(
      'GET',
      '/settings/routes/yaml/',
      { errors: [{ message: 'Not found' }] },
      { status: 404 },
    );
    await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
    await expect.element(page.getByRole('alert')).toHaveTextContent('could not verify');
    await expect
      .element(page.getByRole('link', { name: 'Open site preview', exact: true }))
      .toBeVisible();
    await expect
      .element(page.getByTitle('Home · Mobile composition', { exact: true }))
      .not.toBeInTheDocument();
  });

  it('keeps the canvas available without chat tabs or provider setup', async () => {
    await commands.canvasPointerViewport(true);
    await fakeBuilderWorld();
    await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
    try {
      await expect.element(page.getByRole('region', { name: 'Theme canvas' })).toBeVisible();
      await expect.element(page.getByRole('tab', { name: 'Chat' })).not.toBeInTheDocument();
      await expect
        .element(page.getByRole('textbox', { name: 'Describe a change' }))
        .not.toBeInTheDocument();
      await expect
        .element(page.getByRole('link', { name: 'Back to Design settings' }))
        .toBeVisible();
    } finally {
      await commands.canvasPointerViewport(false);
    }
  });

  it('returns to Design settings with an explanation when unavailable', async () => {
    fakeSettingsScreens();
    await renderAdminApp('/builder/theme', { labs: {} });

    await expect.poll(currentRoute).toBe('/settings/design');
    await expect.element(settingsScreen.design()).toBeVisible();
    await new Promise((resolve) => {
      window.setTimeout(resolve, 1000);
    });

    const notification = settingsScreen.infoToast();
    await expect.element(notification).toHaveAttribute('data-visible', 'true');
    await expect
      .element(notification)
      .toHaveTextContent('Design Builder is not available on this site.');
  });

  it('offers a route back to Design settings when Builder data fails to load', async () => {
    fakeAdminEndpoint('GET', '/settings/routes/yaml/', yamlResponse(defaultRoutes), {
      contentType: 'application/yaml',
    });
    fakeAdminEndpoint('GET', '/themes/', { themes: activeThemeResponse().themes });
    fakeAdminEndpoint(
      'GET',
      '/custom_theme_settings/',
      { errors: [{ message: 'Unavailable' }] },
      { status: 500 },
    );
    await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });

    await expect
      .element(
        page.getByText(
          'Builder could not load the active theme. Return to Design settings and try again.',
        ),
      )
      .toBeVisible();
    await expect
      .element(page.getByRole('link', { name: 'Back to Design settings' }))
      .toHaveAttribute('href', '#/settings/design');
  });

  it('runs the development Pi tool-loop proof in a real browser', async () => {
    await renderAdminApp('/builder/theme?proof=pi', { labs: { designBuilder: true } });

    await page.getByRole('button', { name: 'Run OpenAI proof' }).click();
    await expect
      .element(page.getByTestId('pi-proof-result'))
      .toHaveTextContent('OpenAI Pi provider proof passed');

    await page.getByRole('button', { name: 'Run Anthropic proof' }).click();
    await expect
      .element(page.getByTestId('pi-proof-result'))
      .toHaveTextContent('Anthropic Pi provider proof passed');
  });

  it('keeps theme state and visible conversation aligned after rewinding an earlier turn', async () => {
    await renderAdminApp('/builder/theme?proof=rewind', { labs: { designBuilder: true } });

    await page.getByRole('button', { name: 'Run first edit' }).click();
    await expect.element(page.getByText('First edit', { exact: true })).toBeVisible();
    const secondEdit = page.getByRole('button', { name: 'Run second edit' });
    await expect.element(secondEdit).toBeEnabled();
    await secondEdit.click();
    await expect.element(page.getByText('Second edit', { exact: true })).toBeVisible();
    const rendered = page.getByTestId('rewind-proof-rendered');
    await expect.element(rendered).toHaveTextContent(/Rendered path: \/second\/$/);

    await page.getByRole('button', { name: 'Undo this message' }).first().click();
    await expect.element(page.getByRole('heading', { name: 'Undo this message?' })).toBeVisible();
    await page.getByRole('button', { name: 'Undo and discard later work' }).click();

    await expect.element(rendered).toHaveTextContent('Initial');
    expect(document.querySelector('article[data-role="user"]')).toBeNull();
    await expect
      .element(page.getByRole('textbox', { name: 'Describe a change' }))
      .toHaveValue('First edit');
    expect(page.getByText('Second edit', { exact: true }).query()).toBeNull();
    await expect.element(rendered).toHaveTextContent('#000000');
    await expect.element(rendered).toHaveTextContent(/Rendered path: \/$/);
    await expect.element(page.getByTitle('Rewind proof preview')).toBeVisible();
    await expect
      .element(page.getByTestId('rewind-proof-url'))
      .toHaveTextContent('https://example.com/');
    await expect.element(page.getByTestId('rewind-proof-selection')).toHaveTextContent('none');

    await page.getByRole('button', { name: 'Continue after rewind' }).click();
    await expect.element(page.getByText('Continue on a new branch', { exact: true })).toBeVisible();
    await expect.element(rendered).toHaveTextContent('Branched');
    await expect.element(rendered).toHaveTextContent('#333333');
    await expect.element(rendered).toHaveTextContent(/Rendered path: \/branch\/$/);
    await expect
      .element(page.getByTestId('rewind-proof-url'))
      .toHaveTextContent('https://example.com/branch/');
    await expect
      .element(page.getByTestId('rewind-proof-selection'))
      .toHaveTextContent('Branch hero');
  });

  it('publishes a built-in theme as an activated copy before saving staged settings', async () => {
    const upload = fakeAdminEndpoint('POST', '/themes/upload/?copy_settings_from=source', {
      themes: [{ name: 'source-edited', active: false, package: {} }],
    });
    const activate = fakeAdminEndpoint('PUT', '/themes/source-edited/activate/', {
      themes: [{ name: 'source-edited', active: true, package: {} }],
    });
    const settings = fakeAdminEndpoint('PUT', '/settings/', ({ body }) => body);
    const customSettings = fakeAdminEndpoint('PUT', '/custom_theme_settings/', ({ body }) => body);
    await renderAdminApp('/builder/theme?proof=publish&flow=builtin', {
      labs: { designBuilder: true },
    });

    await expect.element(page.getByTestId('publish-proof-dirty')).toHaveTextContent('Dirty: true');
    await page.getByRole('button', { name: 'Publish changes' }).click();
    await expect.element(page.getByLabelText('Theme copy name')).toHaveValue('source-edited');
    await page.getByRole('button', { name: 'Publish and activate copy' }).click();

    await expect
      .element(page.getByTestId('publish-proof-result'))
      .toHaveTextContent('published:source-edited');
    await expect.element(page.getByTestId('publish-proof-dirty')).toHaveTextContent('Dirty: false');
    expect(upload.requests).toHaveLength(1);
    expect(upload.lastRequest?.body).toMatchObject({
      file: { filename: 'source-edited.zip', type: 'application/zip' },
    });
    expect(activate.requests).toHaveLength(1);
    expect(settings.lastRequest?.body).toEqual({
      settings: [{ key: 'accent_color', value: '#123456' }],
    });
    expect(customSettings.lastRequest?.body).toEqual({
      custom_theme_settings: [{ key: 'layout', value: 'Grid' }],
    });
  });

  it('publishes an editable custom theme in place without activation', async () => {
    const installedArchive = await new JSZip()
      .file('edition/package.json', JSON.stringify({ name: 'edition', version: '1.0.0' }))
      .file('edition/index.hbs', '<main>Initial</main>')
      .generateAsync({ type: 'arraybuffer' });
    fakeAdminEndpoint('GET', '/themes/edition/download/', installedArchive, {
      contentType: 'application/zip',
    });
    const upload = fakeAdminEndpoint('POST', '/themes/upload/', {
      themes: [{ name: 'edition', active: true, package: {} }],
    });
    const settings = fakeAdminEndpoint('PUT', '/settings/', ({ body }) => body);
    const customSettings = fakeAdminEndpoint('PUT', '/custom_theme_settings/', ({ body }) => body);
    await renderAdminApp('/builder/theme?proof=publish&flow=custom', {
      labs: { designBuilder: true },
    });

    await expect.element(page.getByTestId('publish-proof-dirty')).toHaveTextContent('Dirty: true');
    await page.getByRole('button', { name: 'Publish changes' }).click();
    await expect
      .element(page.getByRole('heading', { name: 'Publish theme changes?' }))
      .toBeVisible();
    await page.getByRole('button', { name: 'Publish changes' }).last().click();

    await expect
      .element(page.getByTestId('publish-proof-result'))
      .toHaveTextContent('published:edition');
    await expect.element(page.getByTestId('publish-proof-dirty')).toHaveTextContent('Dirty: false');
    expect(upload.requests).toHaveLength(1);
    expect(upload.lastRequest?.body).toMatchObject({
      file: { filename: 'edition.zip', type: 'application/zip' },
    });
    expect(settings.requests).toHaveLength(1);
    expect(customSettings.requests).toHaveLength(1);
  });

  it('keeps the last valid iframe document and virtual URL through render repair', async () => {
    await renderAdminApp('/builder/theme?proof=preview', { labs: { designBuilder: true } });

    const result = page.getByTestId('preview-proof-result');
    const frameElement = page.getByTestId('preview-proof-frame');
    await expect.element(frameElement).toBeVisible();
    await expect.element(result).toHaveTextContent('ready:https://example.com/');
    const initialImage = await frameElement.screenshot({ base64: true });

    await page.getByRole('button', { name: 'Navigate preview' }).click();
    await expect.element(result).toHaveTextContent('virtual:https://example.com/about/');
    const lastValidImage = await frameElement.screenshot({ base64: true });
    expect(lastValidImage.base64).not.toBe(initialImage.base64);

    await page.getByRole('button', { name: 'Break candidate' }).click();
    await expect.element(result).toHaveTextContent('invalid:https://example.com/about/');
    const retainedImage = await frameElement.screenshot({ base64: true });
    expect(retainedImage.base64).toBe(lastValidImage.base64);

    await page.getByRole('button', { name: 'Bypass bridge' }).click();
    await expect.element(result).toHaveTextContent('bypass-blocked:https://example.com/about/');
    const recoveredImage = await frameElement.screenshot({ base64: true });
    expect(recoveredImage.base64).toBe(lastValidImage.base64);

    await page.getByRole('button', { name: 'Bypass after ready' }).click();
    await expect
      .element(result)
      .toHaveTextContent('late-bypass-blocked:https://example.com/about/');
    const lateRecoveredImage = await frameElement.screenshot({ base64: true });
    expect(lateRecoveredImage.base64).toBe(lastValidImage.base64);

    await page.getByRole('button', { name: 'Repair candidate' }).click();
    await expect.element(result).toHaveTextContent('repaired:https://example.com/about/');
    const repairedImage = await frameElement.screenshot({ base64: true });
    expect(repairedImage.base64).not.toBe(lastValidImage.base64);
  });
});
