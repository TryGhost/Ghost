import JSZip from 'jszip';
import { act } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { commands, page, userEvent } from 'vitest/browser';

import {
  activeThemeResponse,
  currentUserResponse,
  currentRoute,
  fakeAdminEndpoint,
  fakeEndpoint,
  fakeSettingsScreens,
  fakeSitePreview,
  renderAdminApp,
  siteResponse,
} from '@test-utils/acceptance';
import { settingsScreen } from '@/settings/settings.screen';
import { CanvasThemePreview } from '@/builder/canvas/canvas-theme-preview';
import defaultRoutes from '../../../../ghost/core/core/server/services/route-settings/default-routes.yaml?raw';
import type { CanvasProbe, ReadResult } from '@/builder/canvas/canvas-probe';
import type { CustomThemeSetting } from '@tryghost/admin-x-framework/api/custom-theme-settings';

const liveHtml =
  '<html><head><link rel="stylesheet" href="/assets/built/screen.css?v=abc123"><script defer src="/ghost/assets/portal.js" data-i18n="true" data-key="0123456789abcdef"></script><script defer src="/ghost/assets/search.js" data-key="0123456789abcdef" data-styles="/ghost/assets/search.css" data-sodo-search="true"></script></head><body>Live site</body></html>';

const yamlResponse = (source: string) =>
  new Response(source, { headers: { 'Content-Type': 'application/yaml' } });

async function fakeBuilderWorld({
  post = false,
  customSettings = [],
  themeName,
}: {
  post?: boolean;
  customSettings?: CustomThemeSetting[];
  themeName?: string;
} = {}): Promise<void> {
  const activeTheme = activeThemeResponse().themes[0];
  if (!activeTheme) {
    throw new Error('The active theme fixture is missing.');
  }
  const theme = { ...activeTheme, name: themeName ?? activeTheme.name };
  fakeAdminEndpoint('GET', '/themes/', { themes: [theme] });
  fakeAdminEndpoint('GET', '/themes/active/', { themes: [theme] });
  const design = customSettings.length
    ? '<style>body{color:{{@site.accent_color}};background:{{@custom.card_color}};}</style><p>{{@custom.short_label}} · {{@custom.card_layout}}</p>'
    : '';
  const archive = await new JSZip()
    .file(`${theme.name}/package.json`, JSON.stringify({ name: theme.name, version: '1.0.0' }))
    .file(
      `${theme.name}/index.hbs`,
      `<!doctype html><html><head><title>{{@site.title}}</title></head><body>${design}<main data-edit="${theme.name}/index.hbs:1:1"><h1>{{@site.title}}</h1>{{> footer}}</main></body></html>`,
    )
    .file(`${theme.name}/partials/footer.hbs`, '<a href="/">Canvas footer</a>')
    .file(
      `${theme.name}/post.hbs`,
      `<html><body>${design}{{#post}}<h1>{{title}}</h1>{{/post}}{{> footer}}</body></html>`,
    )
    .generateAsync({ type: 'arraybuffer' });
  fakeAdminEndpoint('GET', '/custom_theme_settings/', { custom_theme_settings: customSettings });
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
    'reveals the requested shared canvas frame through native tools without discarding manual text',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {}))
          .data as ReturnType<CanvasProbe['state']>;
      try {
        await expect
          .poll(async () => !(await state()).editor?.busy, { timeout: 30_000 })
          .toBe(true);
        const initial = await state();
        const address = {
          workspaceId: initial.workspaceId,
          expectedRevision: initial.editor!.sourceRevision,
        };
        const reveal = async (frameId: string, expectedRevision = address.expectedRevision) => {
          const result = await commands.canvasNativeTool('ghost_canvas_reveal_frame', {
            ...address,
            expectedRevision,
            frameId,
          });
          return result;
        };
        expect(await reveal('home-mobile', 'obsolete')).toMatchObject({ code: 'stale_revision' });
        expect(await reveal('missing-frame')).toMatchObject({ code: 'target_unavailable' });
        expect((await state()).view).toEqual(initial.view);
        expect(await reveal('home-mobile')).toMatchObject({
          status: 'ok',
          data: { requested: true, frameId: 'home-mobile' },
        });
        await expect.poll(async () => (await state()).view.selectedFrameId).toBe('home-mobile');
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).dblClick();
        const text = frame.getByRole('textbox', { name: /^Edit / });
        await text.fill('Retained during native navigation');
        await expect
          .poll(async () => (await state()).editor!.manualDraft)
          .toMatchObject({
            frameId: 'home-mobile',
            text: 'Retained during native navigation',
          });
        expect(await reveal('post-mobile')).toMatchObject({ status: 'ok' });
        await expect.poll(async () => (await state()).view.selectedFrameId).toBe('post-mobile');
        await page
          .frameLocator(page.getByTitle('Post · Mobile composition', { exact: true }))
          .getByRole('link', { name: 'Canvas footer', exact: true })
          .hover();
        expect((await state()).editor).toMatchObject({
          sourceRevision: address.expectedRevision,
          dirty: false,
          manualDraft: { frameId: 'home-mobile', text: 'Retained during native navigation' },
        });
        expect((await state()).frames).toEqual(initial.frames);
        expect(await reveal('home-mobile')).toMatchObject({ status: 'ok' });
        await text.click();
        expect((await state()).view.camera.scale).toBe(1);
        await userEvent.keyboard('{Enter}');
        await expect.poll(async () => (await state()).editor!.dirty).toBe(true);
        await expect.poll(async () => !(await state()).editor!.busy).toBe(true);
        const changed = await state();
        expect(changed.editor!.sourceRevision).not.toBe(address.expectedRevision);
        const saved = await commands.canvasNativeTool('ghost_canvas_read_theme', {
          workspaceId: changed.workspaceId,
          expectedRevision: changed.editor!.sourceRevision,
          operation: 'read_file',
          path: 'partials/footer.hbs',
        });
        expect(JSON.stringify(saved)).toContain('Retained during native navigation');
      } finally {
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
    },
  );

  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'publishes the reviewed custom theme in place and reports a later preview failure truthfully',
    { timeout: 60_000 },
    async () => {
      await fakeBuilderWorld({ post: true, themeName: 'edition' });
      const upload = fakeAdminEndpoint('POST', '/themes/upload/', {
        themes: [{ name: 'edition', active: true, package: {} }],
      });
      const preview = vi.spyOn(CanvasThemePreview.prototype, 'renderCandidate');
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {}))
          .data as ReturnType<CanvasProbe['state']>;
      try {
        await expect
          .poll(async () => !(await state()).editor?.busy, { timeout: 30_000 })
          .toBe(true);
        const initial = await state();
        expect(
          await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
            workspaceId: initial.workspaceId,
            expectedRevision: initial.editor!.sourceRevision,
            expectedDataGeneration: 0,
            files: [
              {
                operation: 'write',
                path: 'partials/footer.hbs',
                content: '<a href="/">Custom publication</a>',
              },
            ],
          }),
        ).toMatchObject({ status: 'ok' });
        await expect
          .poll(async () => !(await state()).editor?.busy, { timeout: 30_000 })
          .toBe(true);
        preview.mockResolvedValue({
          valid: false,
          revision: (await state()).editor!.sourceRevision,
          diagnostics: [
            { severity: 'error', code: 'preview_offline', message: 'Post preview offline' },
          ],
        });
        await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
        const dialog = page.getByRole('alertdialog');
        await expect
          .element(dialog.getByText('partials/footer.hbs', { exact: false }))
          .toBeVisible();
        await dialog.getByRole('button', { name: 'Publish changes', exact: true }).click();
        await expect.element(dialog).not.toBeInTheDocument();
        await expect
          .element(page.getByText(/The theme was published, but its preview could not refresh/))
          .toBeVisible();
        expect(upload.requests).toHaveLength(1);
        expect(upload.lastRequest?.body).toMatchObject({ file: { filename: 'edition.zip' } });
        expect((await state()).editor).toMatchObject({
          dirty: false,
          theme: { name: 'edition', builtIn: false },
          busy: true,
        });
        expect(
          await commands.canvasNativeTool('ghost_canvas_open_publication_review', {
            workspaceId: (await state()).workspaceId,
            expectedRevision: (await state()).editor!.sourceRevision,
          }),
        ).toMatchObject({ status: 'error' });
      } finally {
        vi.restoreAllMocks();
        await screen.unmount();
      }
    },
  );

  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'shares pinned publication review with native opening and preserves excluded manual drafts',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const themeName = activeThemeResponse().themes[0].name;
      const upload = fakeAdminEndpoint('POST', `/themes/upload/?copy_settings_from=${themeName}`, {
        themes: [{ name: `${themeName}-edited`, active: false, package: {} }],
      });
      fakeAdminEndpoint('PUT', `/themes/${themeName}-edited/activate/`, {
        themes: [{ name: `${themeName}-edited`, active: true, package: {} }],
      });
      const settings = fakeAdminEndpoint('PUT', '/settings/', ({ body }) => body);
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {}))
          .data as ReturnType<CanvasProbe['state']>;
      const ready = () =>
        expect.poll(async () => !(await state()).editor?.busy, { timeout: 30_000 }).toBe(true);
      const address = async () => {
        const current = await state();
        return {
          workspaceId: current.workspaceId,
          expectedRevision: current.editor!.sourceRevision,
          expectedDataGeneration: (current.editor!.render as { dataGeneration: number })
            .dataGeneration,
        };
      };
      try {
        await ready();
        expect(
          await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
            ...(await address()),
            files: [
              {
                operation: 'write',
                path: 'partials/footer.hbs',
                content: '<a href="/">Reviewed footer</a>',
              },
            ],
            settings: { 'global.accent_color': '#123456' },
          }),
        ).toMatchObject({ status: 'ok' });
        await ready();
        await page.getByRole('button', { name: /^Theme settings/ }).click();
        await page
          .getByRole('textbox', { name: 'Heading font', exact: true })
          .fill('Pending publication font');
        await page.getByRole('button', { name: /^Theme settings/ }).click();
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        await frame.getByRole('link', { name: 'Reviewed footer', exact: true }).dblClick();
        await frame.getByRole('textbox', { name: /^Edit / }).fill('Pending manual footer');
        const camera = page.getByTestId('canvas-world').element().getAttribute('style');
        await expect
          .element(page.getByRole('button', { name: 'Publish changes', exact: true }))
          .toBeEnabled();
        await page.getByRole('button', { name: 'Publish changes', exact: true }).click();
        expect((await state()).editor!.publicationReview).toMatchObject({
          files: [{ path: 'partials/footer.hbs', change: 'modified' }],
        });
        await expect
          .element(page.getByRole('alertdialog').getByText('partials/footer.hbs', { exact: false }))
          .toBeVisible();
        await expect.element(page.getByText('Accent color', { exact: true })).toBeVisible();
        await expect
          .element(
            page.getByText('Pending text and unapplied settings are excluded and will be kept.', {
              exact: true,
            }),
          )
          .toBeVisible();
        await page.getByRole('button', { name: 'Cancel', exact: true }).click();
        expect(
          await commands.canvasNativeTool('ghost_canvas_open_publication_review', {
            workspaceId: (await state()).workspaceId,
            expectedRevision: (await state()).editor!.sourceRevision,
          }),
        ).toMatchObject({
          status: 'ok',
          data: { opened: true, review: { pending: { text: true, settings: true } } },
        });
        expect(upload.requests).toHaveLength(0);
        expect(
          await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
            ...(await address()),
            settings: { 'global.accent_color': '#654321' },
          }),
        ).toMatchObject({ status: 'ok' });
        await ready();
        await expect
          .element(page.getByRole('button', { name: 'Publish and activate copy', exact: true }))
          .toBeDisabled();
        await page.getByRole('button', { name: 'Review latest changes', exact: true }).click();
        await page.getByRole('button', { name: 'Publish and activate copy', exact: true }).click();
        await expect.poll(() => upload.requests.length).toBe(1);
        await ready();
        await expect.element(page.getByRole('alertdialog')).not.toBeInTheDocument();
        expect(settings.lastRequest?.body).toEqual({
          settings: [{ key: 'accent_color', value: '#654321' }],
        });
        expect((await state()).editor!.theme).toMatchObject({
          name: `${themeName}-edited`,
          builtIn: false,
        });
        await expect
          .element(page.getByText(`Canvas · ${themeName}-edited`, { exact: true }))
          .toBeVisible();
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        expect((await state()).editor!.manualDraft).toMatchObject({
          text: 'Pending manual footer',
          detached: true,
          conflict: false,
        });
        await page.getByRole('button', { name: /^Theme settings/ }).click();
        await expect
          .element(page.getByRole('textbox', { name: 'Heading font', exact: true }))
          .toHaveValue('Pending publication font');
        await page.getByRole('button', { name: /^Theme settings/ }).click();
        await page.getByRole('button', { name: 'Resume text draft', exact: true }).click();
        await frame.getByRole('textbox', { name: /^Edit / }).click();
        await userEvent.keyboard('{Enter}');
        await ready();
        await frame.getByRole('link', { name: 'Pending manual footer', exact: true }).hover();
        await page.getByRole('button', { name: 'Undo theme change', exact: true }).click();
        await ready();
        expect((await state()).editor!.theme).toMatchObject({
          name: `${themeName}-edited`,
          builtIn: false,
        });
        expect(upload.requests).toHaveLength(1);
      } finally {
        await screen.unmount();
      }
    },
  );

  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'loads a later published Post explicitly on an empty site and keeps the mounted Home frames',
    { timeout: 60_000 },
    async () => {
      await fakeBuilderWorld();
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {})).data as {
          workspaceId: string;
          editor: {
            sourceRevision: string;
            busy: boolean;
            dirty: boolean;
            render: { dataGeneration: number; representativePost: { id: string } | null };
            history: unknown;
          };
        };
      try {
        await expect.poll(async () => !(await state()).editor.busy, { timeout: 30_000 }).toBe(true);
        const initial = await state();
        const home = [...document.querySelectorAll('iframe[title^="Home"]')];
        expect(home).toHaveLength(4);
        await page.getByRole('button', { name: 'Choose preview Post', exact: true }).click();
        await expect
          .element(page.getByText('No published Posts found.', { exact: true }))
          .toBeVisible();
        const siteUrl = siteResponse().site.url as string;
        const post = {
          id: 'later',
          slug: 'later',
          title: 'Published later',
          url: new URL('later/', siteUrl).href,
          visibility: 'public',
          html: '<p>Later body</p>',
          tags: [],
          authors: [],
        };
        fakeEndpoint('GET', `${new URL('/ghost/api/content/posts/', siteUrl).href}*`, {
          posts: [post],
          meta: { pagination: { next: null } },
        });
        fakeEndpoint('GET', `${new URL('/ghost/api/content/posts/later/', siteUrl).href}*`, {
          posts: [post],
        });
        fakeEndpoint('GET', `${new URL('/ghost/api/content/posts/slug/later/', siteUrl).href}*`, {
          posts: [post],
        });
        await page.getByRole('button', { name: 'Load Posts', exact: true }).click();
        await page.getByRole('button', { name: 'Use Post: Published later', exact: true }).click();
        await expect
          .poll(
            async () =>
              !(await state()).editor.busy &&
              document.querySelectorAll('iframe[data-preview-status="Ready"]').length === 8,
            { timeout: 30_000 },
          )
          .toBe(true);
        const current = await state();
        expect(current.editor).toMatchObject({
          sourceRevision: initial.editor.sourceRevision,
          dirty: false,
          render: { dataGeneration: 1, representativePost: { id: 'later' } },
        });
        expect(current.editor.history).toEqual(initial.editor.history);
        expect([...document.querySelectorAll('iframe[title^="Home"]')]).toEqual(home);
        expect(
          [...document.querySelectorAll('iframe[title^="Post"]')].every((iframe) =>
            (iframe as HTMLIFrameElement).srcdoc.includes(post.title),
          ),
        ).toBe(true);
      } finally {
        await screen.unmount();
      }
    },
  );
  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'preserves live text and the accepted binding when a listed Post disappears',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {})).data as {
          editor: {
            sourceRevision: string;
            busy: boolean;
            render: unknown;
            manualDraft: { text: string } | null;
          };
        };
      try {
        await expect.poll(async () => !(await state()).editor.busy, { timeout: 30_000 }).toBe(true);
        const initial = await state();
        const iframes = [
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ];
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).dblClick();
        await frame.getByRole('textbox', { name: /^Edit / }).fill('Keep this live text');
        const siteUrl = siteResponse().site.url as string;
        fakeEndpoint('GET', `${new URL('/ghost/api/content/posts/', siteUrl).href}*`, {
          posts: [{ id: 'gone', title: 'Gone Post', url: new URL('gone/', siteUrl).href }],
          meta: { pagination: { next: null } },
        });
        fakeEndpoint(
          'GET',
          `${new URL('/ghost/api/content/posts/slug/published-post/', siteUrl).href}*`,
          {
            posts: [
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
            ],
          },
        );
        fakeEndpoint(
          'GET',
          `${new URL('/ghost/api/content/posts/gone/', siteUrl).href}*`,
          { errors: [] },
          { status: 404 },
        );
        await page.getByRole('button', { name: 'Choose preview Post', exact: true }).click();
        await page.getByRole('button', { name: 'Use Post: Gone Post', exact: true }).click();
        await expect
          .element(
            page
              .getByRole('dialog', { name: 'Preview Post' })
              .getByText('Could not load published Posts. Try loading again.', { exact: true }),
          )
          .toBeVisible();
        expect((await state()).editor).toMatchObject({
          sourceRevision: initial.editor.sourceRevision,
          busy: false,
          render: initial.editor.render,
          manualDraft: { text: 'Keep this live text' },
        });
        expect([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]).toEqual(iframes);
        await page.getByRole('button', { name: 'Choose preview Post', exact: true }).click();
        await frame.getByRole('textbox', { name: /^Edit / }).click();
        await userEvent.keyboard('{Enter}');
        await expect.poll(async () => !(await state()).editor.busy, { timeout: 30_000 }).toBe(true);
        expect(
          iframes.every((iframe) =>
            (iframe as HTMLIFrameElement).srcdoc.includes('Keep this live text'),
          ),
        ).toBe(true);
      } finally {
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
    },
  );
  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'switches representative Posts through the picker and native action without losing source, frames or manual text',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const siteUrl = siteResponse().site.url as string;
      const first = {
        id: 'published-post',
        slug: 'published-post',
        url: new URL('published-post/', siteUrl).href,
        title: 'Published canvas example',
        visibility: 'public',
        html: '<p>First body</p>',
        tags: [],
        authors: [],
      };
      const second = {
        ...first,
        id: 'second-post',
        slug: 'second-post',
        url: new URL('second-post/', siteUrl).href,
        title: 'Another published Post',
      };
      for (const post of [first, second]) {
        fakeEndpoint('GET', `${new URL(`/ghost/api/content/posts/${post.id}/`, siteUrl).href}*`, {
          posts: [post],
        });
        fakeEndpoint(
          'GET',
          `${new URL(`/ghost/api/content/posts/slug/${post.slug}/`, siteUrl).href}*`,
          { posts: [post] },
        );
      }
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {})).data as {
          workspaceId: string;
          editor: {
            sourceRevision: string;
            busy: boolean;
            dirty: boolean;
            render: { dataGeneration: number; representativePost: { id: string } };
            history: unknown;
            manualDraft: { text: string } | null;
          };
          frames: Array<{
            id: string;
            frameHandle: string;
            device: { representationHandle: string; revision: string; renderKey: string };
          }>;
        };
      const ready = () =>
        expect
          .poll(
            async () =>
              !(await state()).editor.busy &&
              document.querySelectorAll('iframe[data-preview-status="Ready"]').length === 8,
            { timeout: 30_000 },
          )
          .toBe(true);
      try {
        await ready();
        const initial = await state();
        const oldPost = initial.frames.find((frame) => frame.id === 'post-mobile')!;
        const staleTarget = {
          workspaceId: initial.workspaceId,
          frameHandle: oldPost.frameHandle,
          representationHandle: oldPost.device.representationHandle,
          expectedRevision: oldPost.device.revision,
          expectedRenderKey: oldPost.device.renderKey,
        };
        const iframes = [
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ];
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).dblClick();
        await frame
          .getByRole('textbox', { name: /^Edit / })
          .fill('Manual text across Post changes');
        const camera = page.getByTestId('canvas-world').element().getAttribute('style');
        fakeEndpoint('GET', `${new URL('/ghost/api/content/posts/', siteUrl).href}*`, {
          posts: [first, second],
          meta: { pagination: { next: null } },
        });
        // Reinstall exact resource reads above the broad browse response.
        for (const post of [first, second]) {
          fakeEndpoint('GET', `${new URL(`/ghost/api/content/posts/${post.id}/`, siteUrl).href}*`, {
            posts: [post],
          });
          fakeEndpoint(
            'GET',
            `${new URL(`/ghost/api/content/posts/slug/${post.slug}/`, siteUrl).href}*`,
            { posts: [post] },
          );
        }
        await page.getByRole('button', { name: 'Choose preview Post', exact: true }).click();
        await page
          .getByRole('button', { name: 'Use Post: Another published Post', exact: true })
          .click();
        await ready();
        let current = await state();
        expect(current.editor).toMatchObject({
          sourceRevision: initial.editor.sourceRevision,
          dirty: false,
          render: { dataGeneration: 1, representativePost: { id: second.id } },
          manualDraft: { text: 'Manual text across Post changes' },
        });
        expect(current.editor.history).toEqual(initial.editor.history);
        expect([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]).toEqual(iframes);
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        expect(
          iframes
            .filter((iframe) => iframe.getAttribute('title')?.startsWith('Post'))
            .every((iframe) => (iframe as HTMLIFrameElement).srcdoc.includes(second.title)),
        ).toBe(true);
        expect(
          await commands.canvasNativeTool('ghost_canvas_probe_inspect_frame', staleTarget),
        ).toMatchObject({ status: 'error' });
        expect(
          await commands.canvasNativeTool('ghost_canvas_list_posts', {
            workspaceId: current.workspaceId,
            expectedRevision: current.editor.sourceRevision,
          }),
        ).toMatchObject({
          status: 'ok',
          data: { posts: [{ id: first.id }, { id: second.id }], nextPage: null },
        });
        expect(
          await commands.canvasNativeTool('ghost_canvas_select_post', {
            workspaceId: current.workspaceId,
            expectedRevision: current.editor.sourceRevision,
            expectedDataGeneration: 0,
            id: first.id,
          }),
        ).toMatchObject({ status: 'error' });
        expect(
          await commands.canvasNativeTool('ghost_canvas_select_post', {
            workspaceId: current.workspaceId,
            expectedRevision: current.editor.sourceRevision,
            expectedDataGeneration: 1,
            id: first.id,
          }),
        ).toMatchObject({ status: 'ok', data: { accepted: true, dataGeneration: 2 } });
        await ready();
        current = await state();
        expect(current.editor.history).toEqual(initial.editor.history);
        expect(current.editor.manualDraft?.text).toBe('Manual text across Post changes');
        expect(
          iframes
            .filter((iframe) => iframe.getAttribute('title')?.startsWith('Post'))
            .every((iframe) => (iframe as HTMLIFrameElement).srcdoc.includes(first.title)),
        ).toBe(true);
        await page.getByRole('button', { name: 'Resume text draft', exact: true }).click();
        await frame.getByRole('textbox', { name: /^Edit / }).click();
        await userEvent.keyboard('{Enter}');
        await ready();
        expect(
          iframes.every((iframe) =>
            (iframe as HTMLIFrameElement).srcdoc.includes('Manual text across Post changes'),
          ),
        ).toBe(true);
      } finally {
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
    },
  );

  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1')(
    'inspects the selected live composition through native WebMCP and clears obsolete board context',
    { timeout: 60_000 },
    async () => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {})).data as {
          workspaceId: string;
          view: { selectedFrameId: string | null };
          editor: {
            busy: boolean;
            selection: null | {
              frameId: string;
              representation: string;
              context: { data: { occurrence: string } };
              target: Record<string, string>;
            };
          };
          frames: Array<{
            id: string;
            frameHandle: string;
            device: { representationHandle: string; revision: string; renderKey: string };
          }>;
        };
      try {
        await expect.poll(async () => !(await state()).editor.busy, { timeout: 30_000 }).toBe(true);
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).click();
        const selected = (await state()).editor.selection!;
        expect(selected).toMatchObject({
          frameId: 'home-mobile',
          representation: 'expanded',
        });
        expect(selected.target.documentId).toEqual(expect.any(String));
        expect(selected.target.documentInstanceId).toEqual(expect.any(String));
        const camera = page.getByTestId('canvas-world').element().getAttribute('style');
        const inspect = await commands.canvasNativeTool('ghost_canvas_probe_inspect_element', {
          ...selected.target,
          occurrence: selected.context.data.occurrence,
        });
        expect(inspect).toMatchObject({
          status: 'ok',
          data: { representation: 'expanded', element: { text: 'Canvas footer' } },
        });
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        expect((await state()).editor.selection).toEqual(selected);
        const current = await state();
        const device = current.frames.find((item) => item.id === 'home-mobile')!;
        expect(
          await commands.canvasNativeTool('ghost_canvas_probe_inspect_element', {
            ...selected.target,
            representationHandle: device.device.representationHandle,
            occurrence: selected.context.data.occurrence,
          }),
        ).toMatchObject({ status: 'error' });
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        await page.getByRole('button', { name: 'Home · Desktop', exact: true }).click();
        expect(await state()).toMatchObject({
          view: { selectedFrameId: 'home-desktop' },
          editor: { selection: null },
        });
        await expect
          .element(page.getByRole('button', { name: 'View template source', exact: true }))
          .toBeDisabled();
        // Explicit reads retain their addressed target even after the person selects another frame.
        expect(
          await commands.canvasNativeTool('ghost_canvas_probe_inspect_element', {
            ...selected.target,
            occurrence: selected.context.data.occurrence,
          }),
        ).toMatchObject({ status: 'ok', data: { element: { text: 'Canvas footer' } } });
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).click();
        await expect
          .poll(async () => (await state()).editor.selection?.frameId)
          .toBe('home-mobile');
        await page
          .getByRole('region', { name: 'Theme canvas', exact: true })
          .click({ position: { x: 8, y: 8 } });
        expect(await state()).toMatchObject({
          view: { selectedFrameId: null },
          editor: { selection: null },
        });
      } finally {
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
    },
  );
  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1').each([true, false])(
    'keeps selecting and starts a manual text draft while a native agent candidate renders (accepted: %s)',
    { timeout: 60_000 },
    async (accepted) => {
      await commands.canvasPointerViewport(true);
      await fakeBuilderWorld({ post: true });
      const screen = await renderAdminApp('/builder/theme', { labs: { designBuilder: true } });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {})).data as {
          workspaceId: string;
          editor: {
            sourceRevision: string;
            busy: boolean;
            selection: {
              frameId: string;
              context: unknown;
              documentId: string;
              documentInstanceId: string;
            } | null;
            manualDraft: { text: string } | null;
          };
        };
      const ready = () =>
        expect
          .poll(
            async () =>
              !(await state()).editor.busy &&
              document.querySelectorAll('iframe[data-preview-status="Ready"]').length === 8,
            { timeout: 30_000 },
          )
          .toBe(true);
      let release!: () => void;
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      let entered = false;
      let patching: Promise<Record<string, unknown>> | undefined;
      // Preserve the method for the gate, then call it on the actual preview instance below.
      // eslint-disable-next-line @typescript-eslint/unbound-method
      const original = CanvasThemePreview.prototype.renderCandidate;
      try {
        await ready();
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblClick();
        const frame = page.frameLocator(
          page.getByTitle('Home · Mobile composition', { exact: true }),
        );
        const initial = await state();
        const iframes = [
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ];
        const camera = page.getByTestId('canvas-world').element().getAttribute('style');
        vi.spyOn(CanvasThemePreview.prototype, 'renderCandidate').mockImplementationOnce(
          async function (this: CanvasThemePreview, draft, signal) {
            entered = true;
            await held;
            return original.call(this, draft, signal);
          },
        );
        patching = commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
          workspaceId: initial.workspaceId,
          expectedRevision: initial.editor.sourceRevision,
          expectedDataGeneration: 0,
          files: [
            {
              operation: 'write',
              path: accepted ? 'index.hbs' : 'post.hbs',
              content: accepted
                ? '<html><body><h1>Agent design</h1>{{> footer}}</body></html>'
                : '{{> missing_canvas_partial}}',
            },
          ],
        });
        await expect.poll(() => entered).toBe(true);
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).click();
        await expect
          .poll(async () => (await state()).editor.selection?.frameId)
          .toBe('home-mobile');
        await frame.getByRole('link', { name: 'Canvas footer', exact: true }).dblClick();
        await frame
          .getByRole('textbox', { name: /^Edit / })
          .fill('Manual text during agent rendering');
        await expect
          .poll(async () => (await state()).editor.manualDraft?.text)
          .toBe('Manual text during agent rendering');
        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).click();
        expect((await state()).editor.selection).toBeNull();
        expect((await state()).editor.manualDraft?.text).toBe('Manual text during agent rendering');
        await frame.getByRole('heading', { name: 'Rendered site', exact: true }).click();
        await expect
          .poll(async () => (await state()).editor.selection?.frameId)
          .toBe('home-mobile');
        const selected = (await state()).editor.selection;
        release();
        expect(await patching).toMatchObject({ status: accepted ? 'ok' : 'error' });
        await ready();
        expect([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]).toEqual(iframes);
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        if (accepted) {
          expect((await state()).editor.selection).toBeNull();
          await expect
            .element(page.getByRole('button', { name: 'Resume text draft', exact: true }))
            .toBeEnabled();
          await page.getByRole('button', { name: 'Resume text draft', exact: true }).click();
        } else {
          expect((await state()).editor.sourceRevision).toBe(initial.editor.sourceRevision);
          expect((await state()).editor.selection).toMatchObject({
            frameId: selected!.frameId,
            context: selected!.context,
            documentId: selected!.documentId,
            documentInstanceId: selected!.documentInstanceId,
          });
        }
        await frame.getByRole('textbox', { name: /^Edit / }).click();
        await userEvent.keyboard('{Enter}');
        await ready();
        await frame
          .getByRole('link', { name: 'Manual text during agent rendering', exact: true })
          .hover();
        expect(
          iframes.every((iframe) =>
            (iframe as HTMLIFrameElement).srcdoc.includes('Manual text during agent rendering'),
          ),
        ).toBe(true);
      } finally {
        release();
        await patching?.catch(() => {});
        vi.restoreAllMocks();
        await screen.unmount();
        await commands.canvasPointerViewport(false);
      }
    },
  );
  it.runIf(import.meta.env.VITE_CANVAS_NATIVE_WEBMCP === '1').each([
    { width: 1280, theme: 'light' },
    { width: 1280, theme: 'dark' },
    { width: 390, theme: 'light' },
    { width: 390, theme: 'dark' },
  ])(
    'shares design settings between manual controls and native agent changes without losing staged values ($width px, $theme)',
    { timeout: 60_000 },
    async ({ width, theme }) => {
      await page.viewport(width, 844);
      await fakeBuilderWorld({
        post: true,
        customSettings: [
          { id: 'show', key: 'show_author', type: 'boolean', value: false, default: false },
          {
            id: 'label',
            key: 'short_label',
            type: 'text',
            value: 'Initial label',
            default: 'Initial label',
          },
          {
            id: 'layout',
            key: 'card_layout',
            type: 'select',
            value: 'Narrow',
            default: 'Narrow',
            options: ['Narrow', 'Wide'],
          },
          { id: 'color', key: 'card_color', type: 'color', value: '#112233', default: '#112233' },
        ],
      });
      const me = currentUserResponse();
      me.users[0].accessibility = JSON.stringify({ nightShift: theme });
      const screen = await renderAdminApp('/builder/theme', {
        labs: { designBuilder: true },
        boot: { browseMe: { response: me } },
      });
      const state = async () =>
        (await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {})).data as {
          workspaceId: string;
          editor: { sourceRevision: string; busy: boolean; dirty: boolean };
        };
      const ready = () =>
        expect
          .poll(
            async () =>
              !(await state()).editor.busy &&
              document.querySelectorAll('iframe[data-preview-status="Ready"]').length === 8,
            { timeout: 30_000 },
          )
          .toBe(true);
      const patch = async (settings: Record<string, string>) => {
        const current = await state();
        expect(
          await commands.canvasNativeTool('ghost_canvas_apply_theme_patch', {
            workspaceId: current.workspaceId,
            expectedRevision: current.editor.sourceRevision,
            expectedDataGeneration: 0,
            settings,
          }),
        ).toMatchObject({ status: 'ok', data: { accepted: true } });
        await ready();
      };
      const undo = async () => {
        if (width < 768) {
          await page.getByRole('button', { name: 'Canvas views', exact: true }).click();
          await page.getByRole('menuitem', { name: 'Undo theme change', exact: true }).click();
        } else {
          await page.getByRole('button', { name: 'Undo theme change', exact: true }).click();
        }
        await ready();
      };
      try {
        await ready();
        await expect
          .poll(() => document.documentElement.classList.contains('dark'))
          .toBe(theme === 'dark');
        for (const name of ['Theme settings', 'Publish changes']) {
          const box = page
            .getByRole('button', { name, exact: true })
            .element()
            .getBoundingClientRect();
          expect(box.left).toBeGreaterThanOrEqual(0);
          expect(box.right).toBeLessThanOrEqual(window.innerWidth);
        }
        const iframes = [
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ] as HTMLIFrameElement[];
        const camera = page.getByTestId('canvas-world').element().getAttribute('style');
        await page.getByRole('button', { name: 'Theme settings', exact: true }).click();
        await page.getByRole('textbox', { name: 'Accent color', exact: true }).fill('#445566');
        await page.getByRole('checkbox', { name: 'Show author', exact: true }).click();
        await page.getByRole('textbox', { name: 'Short label', exact: true }).fill('Manual label');
        await page.getByRole('textbox', { name: 'Card color', exact: true }).fill('#abcdef');
        await page.getByRole('combobox', { name: 'Card layout', exact: true }).click();
        await page.getByRole('option', { name: 'Wide', exact: true }).click();
        await page.getByRole('button', { name: 'Apply settings', exact: true }).click();
        await ready();
        expect(iframes).toEqual([
          ...document.querySelectorAll('iframe[title$="composition"],iframe[title$="preview"]'),
        ]);
        expect(page.getByTestId('canvas-world').element().getAttribute('style')).toBe(camera);
        expect(
          iframes.every((iframe) =>
            ['#445566', '#abcdef', 'Manual label', 'Wide'].every((value) =>
              iframe.srcdoc.includes(value),
            ),
          ),
        ).toBe(true);
        const current = await state();
        const settings = await commands.canvasNativeTool('ghost_canvas_read_theme', {
          workspaceId: current.workspaceId,
          expectedRevision: current.editor.sourceRevision,
          operation: 'settings',
        });
        expect(settings.status).toBe('ok');
        expect((settings.data as { settings: unknown[] }).settings).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              identifier: 'global.accent_color',
              stagedValue: '#445566',
            }),
            expect.objectContaining({ identifier: 'theme.show_author', stagedValue: true }),
            expect.objectContaining({
              identifier: 'theme.short_label',
              stagedValue: 'Manual label',
            }),
            expect.objectContaining({ identifier: 'theme.card_layout', stagedValue: 'Wide' }),
            expect.objectContaining({ identifier: 'theme.card_color', stagedValue: '#abcdef' }),
          ]),
        );
        await page
          .getByRole('textbox', { name: 'Short label', exact: true })
          .fill('Keep staged manual value');
        await patch({ 'global.accent_color': '#778899', 'theme.short_label': 'Agent label' });
        expect(
          iframes.every((iframe) =>
            ['#778899', 'Agent label'].every((value) => iframe.srcdoc.includes(value)),
          ),
        ).toBe(true);
        await expect
          .element(page.getByRole('textbox', { name: 'Short label', exact: true }))
          .toHaveValue('Keep staged manual value');
        await page.getByRole('button', { name: 'Apply settings', exact: true }).click();
        await expect
          .element(
            page.getByText('The theme changed. Reload settings before applying your values.', {
              exact: true,
            }),
          )
          .toBeVisible();
        await page.getByRole('button', { name: 'Reload settings', exact: true }).click();
        await expect
          .element(page.getByRole('textbox', { name: 'Short label', exact: true }))
          .toHaveValue('Agent label');
        await expect
          .element(page.getByRole('textbox', { name: 'Accent color', exact: true }))
          .toHaveValue('#778899');
        await userEvent.keyboard('{Escape}');
        await undo();
        await page.getByRole('button', { name: 'Theme settings', exact: true }).click();
        await expect
          .element(page.getByRole('textbox', { name: 'Short label', exact: true }))
          .toHaveValue('Manual label');
        await userEvent.keyboard('{Escape}');
        await undo();
        expect((await state()).editor.dirty).toBe(false);
        await page.getByRole('button', { name: 'Theme settings', exact: true }).click();
        await page.getByRole('textbox', { name: 'Heading font', exact: true }).fill('Staged font');
        expect(
          await commands.canvasNativeTool('ghost_canvas_probe_get_editor_state', {}),
        ).toMatchObject({
          data: { editor: { settingsDraft: { identifiers: ['global.heading_font'] } } },
        });
        await page.viewport(width === 390 ? 1280 : 390, 844);
        await expect
          .element(page.getByRole('textbox', { name: 'Heading font', exact: true }))
          .toHaveValue('Staged font');
        await page.viewport(width, 844);
        await userEvent.keyboard('{Escape}');
        await expect
          .element(
            page.getByRole('button', { name: 'Theme settings (unapplied changes)', exact: true }),
          )
          .toBeVisible();
        await page.getByRole('link', { name: 'Back to Design settings', exact: true }).click();
        await expect
          .element(page.getByRole('heading', { name: 'Are you sure you want to leave this page?' }))
          .toBeVisible();
        await page.getByRole('button', { name: 'Stay', exact: true }).click();
        await page
          .getByRole('button', { name: 'Theme settings (unapplied changes)', exact: true })
          .click();
        await expect
          .element(page.getByRole('textbox', { name: 'Heading font', exact: true }))
          .toHaveValue('Staged font');
        await page.getByRole('button', { name: 'Reload settings', exact: true }).click();
      } finally {
        await screen.unmount();
        await page.viewport(1280, 800);
      }
    },
  );
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
