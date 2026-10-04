import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { randomUUID } from 'node:crypto';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';
import { writeFile } from 'node:fs/promises';
import type { Page } from '@playwright/test';

type NativeTesting = {
  executeTool: (name: string, input: string) => Promise<string | null>;
};
type CanvasState = {
  workspaceId: string;
  view: unknown;
  editor: {
    sourceRevision: string;
    busy: boolean;
    manualDraft: { text: string } | null;
    render: { dataGeneration: number; representativePost: { id: string } };
    history: unknown;
    selection: {
      target: Record<string, unknown>;
      context: { data: { occurrence: string; source: { path: string; line: number } } };
    } | null;
  };
  frames: Array<{
    id: string;
    width: number;
    height: number;
    frameHandle: string;
    device: { representationHandle: string; revision: string; renderKey: string };
  }>;
};

async function uploadCover(page: Page): Promise<string> {
  // A recognizable landscape at real cover dimensions, served by Ghost storage.
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const context = canvas.getContext('2d')!;
    context.fillStyle = '#b9e4dc';
    context.fillRect(0, 0, 1200, 800);
    context.fillStyle = '#f9b45b';
    context.beginPath();
    context.arc(900, 180, 100, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#246e62';
    context.beginPath();
    context.moveTo(0, 800);
    context.lineTo(420, 270);
    context.lineTo(720, 680);
    context.lineTo(980, 380);
    context.lineTo(1200, 800);
    context.fill();
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const response = await page.request.post('/ghost/api/admin/images/upload/', {
    multipart: {
      file: {
        name: 'canvas-landscape.png',
        mimeType: 'image/png',
        buffer: Buffer.from(data, 'base64'),
      },
      purpose: 'image',
    },
  });
  expect(response.status()).toBe(201);
  const { images } = await response.json();
  return images[0].url as string;
}

async function nativeTool<T>(page: Page, name: string, input: Record<string, unknown>): Promise<T> {
  const result = await page.evaluate(
    async ({ name: toolName, input: toolInput }) => {
      const testing = (navigator as Navigator & { modelContextTesting?: NativeTesting })
        .modelContextTesting;
      if (!testing) {
        throw new Error('Native WebMCP testing is unavailable.');
      }
      const output = await testing.executeTool(toolName, JSON.stringify(toolInput));
      if (!output) {
        throw new Error('The native tool returned no result.');
      }
      return JSON.parse(output) as { status: string; data: T };
    },
    { name, input },
  );
  expect(result, JSON.stringify(result)).toMatchObject({ status: 'ok' });
  return result.data;
}

function imageSelector(theme: string, label: string): string {
  if (label.startsWith('Post')) {
    return 'img.gh-feature-image';
  }
  return theme === 'source' ? 'img.gh-header-image' : 'img.site-header-cover';
}

function heroSelector(theme: string, label: string): string {
  if (label.startsWith('Post')) {
    return theme === 'source' ? '.gh-article-header' : '.article-header';
  }
  return theme === 'source' ? '.gh-header' : '.site-header-content';
}

usePerTestIsolation();
test.use({
  actionTimeout: 10_000,
  labs: { designBuilder: true },
  launchOptions: {
    args: [
      '--enable-experimental-web-platform-features',
      '--enable-features=WebMCPTesting,DevToolsWebMCPSupport',
    ],
  },
});

test.describe('Ghost Admin - Live theme canvas', () => {
  for (const { theme, path } of [
    { theme: 'source', path: 'partials/components/footer.hbs' },
    { theme: 'casper', path: 'default.hbs' },
  ]) {
    test(`edits and publishes the real ${theme} theme through its live canvas`, async ({
      page,
    }, testInfo) => {
      test.slow(); // Full shared design, content switching, image inspection and publication journey.
      const cover = await uploadCover(page);
      const settings = await page.request.put('/ghost/api/admin/settings/', {
        data: { settings: [{ key: 'cover_image', value: cover }] },
      });
      expect(settings.ok()).toBe(true);
      const posts = createPostFactory(page.request);
      const first = await posts.create({
        title: 'Canvas published article',
        status: 'published',
        feature_image: cover,
      });
      const second = await posts.create({
        title: 'Another canvas article',
        status: 'published',
        feature_image: cover,
      });
      const activated = await page.request.put(`/ghost/api/admin/themes/${theme}/activate/`);
      expect(activated.ok()).toBe(true);
      const copyName = `canvas-${theme}-${randomUUID()}`;
      let releaseCandidate = () => {};
      let changing: Promise<unknown> | undefined;
      try {
        // API fixture writes happened outside Admin's query cache.
        await page.reload();
        await page.goto('/ghost/#/builder/theme');
        await expect(page.getByRole('region', { name: 'Theme canvas', exact: true })).toBeVisible();
        const labels = ['Home · Desktop', 'Home · Mobile', 'Post · Desktop', 'Post · Mobile'];
        const state = () =>
          nativeTool<CanvasState>(page, 'ghost_canvas_probe_get_editor_state', {});
        const ready = async () => {
          await expect.poll(async () => !(await state()).editor.busy).toBe(true);
          for (const label of labels) {
            for (const kind of ['composition', 'preview']) {
              await expect(page.getByTitle(`${label} ${kind}`, { exact: true })).toHaveAttribute(
                'data-preview-status',
                'Ready',
              );
            }
          }
        };
        const assertImages = async () => {
          for (const label of labels) {
            await expect(
              page
                .frameLocator(`iframe[title="${label} composition"]`)
                .locator(imageSelector(theme, label)),
            ).toBeVisible();
            for (const kind of ['composition', 'preview']) {
              const image = page
                .frameLocator(`iframe[title="${label} ${kind}"]`)
                .locator(imageSelector(theme, label));
              await expect
                .poll(() =>
                  image.evaluate(
                    (node: HTMLImageElement) => node.complete && node.naturalWidth > 0,
                  ),
                )
                .toBe(true);
              await expect(image).toHaveAttribute('src', /canvas-landscape/);
            }
          }
        };
        await ready();
        await assertImages();
        const initial = await nativeTool<CanvasState>(
          page,
          'ghost_canvas_probe_get_editor_state',
          {},
        );
        await nativeTool(page, 'ghost_canvas_reveal_frame', {
          workspaceId: initial.workspaceId,
          expectedRevision: initial.editor.sourceRevision,
          frameId: 'home-mobile',
        });
        const home = page.frameLocator('iframe[title="Home · Mobile composition"]');
        await expect(home.getByRole('heading', { name: 'Canvas published article' })).toBeVisible();
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        await page.getByRole('button', { name: 'Post · Mobile', exact: true }).dblclick();
        const post = page.frameLocator('iframe[title="Post · Mobile composition"]');
        await expect(
          post.getByRole('heading', {
            name: /^(Canvas published article|Another canvas article)$/,
            level: 1,
          }),
        ).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${theme}-live-canvas.png`) });

        // Discover the clicked heading's source through native context, rather than
        // supplying a known template path to the agent.
        await post.getByRole('heading', { level: 1 }).click();
        await expect.poll(async () => (await state()).editor.selection?.target).toBeTruthy();
        const selected = await state();
        const selection = selected.editor.selection!;
        const inspectedHeading = await nativeTool<{
          element: { source: { path: string; line: number }; attributes: { class: string } };
        }>(page, 'ghost_canvas_probe_inspect_element', {
          ...selection.target,
          occurrence: selection.context.data.occurrence,
        });
        expect(inspectedHeading.element.source).toMatchObject(selection.context.data.source);
        const selectedSource = await nativeTool<{ content: string; truncated: boolean }>(
          page,
          'ghost_canvas_read_theme',
          {
            workspaceId: selected.workspaceId,
            expectedRevision: selected.editor.sourceRevision,
            operation: 'read_file',
            path: inspectedHeading.element.source.path,
          },
        );
        expect(selectedSource.truncated).toBe(false);
        const titleLine = selectedSource.content.replace(/^\d+: /gm, '').split('\n')[
          inspectedHeading.element.source.line - 1
        ];
        expect(titleLine).toContain('<h1');
        const headingPatch = {
          workspaceId: selected.workspaceId,
          expectedRevision: selected.editor.sourceRevision,
          expectedDataGeneration: selected.editor.render.dataGeneration,
          files: [
            {
              operation: 'replace',
              path: inspectedHeading.element.source.path,
              oldText: titleLine,
              newText: `<p class="canvas-editorial-kicker">From the journal</p>\n${titleLine}`,
            },
          ],
        };
        await nativeTool(page, 'ghost_canvas_validate_theme_patch', headingPatch);
        expect((await state()).editor.sourceRevision).toBe(selected.editor.sourceRevision);
        await nativeTool(page, 'ghost_canvas_apply_theme_patch', headingPatch);
        await ready();
        await expect(post.getByText('From the journal', { exact: true })).toBeVisible();
        const postTitleClass = inspectedHeading.element.attributes.class.split(' ')[0];

        // Installed Source translates its copyright link; edit source through native
        // WebMCP, then use the literal added by that edit for direct manual editing.
        const beforeFooter = await nativeTool<CanvasState>(
          page,
          'ghost_canvas_probe_get_editor_state',
          {},
        );
        const address = {
          workspaceId: beforeFooter.workspaceId,
          expectedRevision: beforeFooter.editor.sourceRevision,
        };
        const source = await nativeTool<{ content: string; truncated: boolean }>(
          page,
          'ghost_canvas_read_theme',
          {
            ...address,
            operation: 'read_file',
            path,
          },
        );
        expect(source.truncated).toBe(false);
        expect(source.content).toContain('</footer>');
        const template = source.content.replace(/^\d+: /gm, '');
        await nativeTool(page, 'ghost_canvas_apply_theme_patch', {
          ...address,
          expectedDataGeneration: beforeFooter.editor.render.dataGeneration,
          files: [
            {
              operation: 'write',
              path,
              content: template.replace('</footer>', '<p>Canvas draft footer</p></footer>'),
            },
          ],
        });
        await expect(post.getByText('Canvas draft footer', { exact: true })).toBeVisible();
        await ready();
        await expect(page.getByRole('button', { name: 'Undo theme change' })).toBeEnabled();
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        await post.getByText('Canvas draft footer', { exact: true }).dblclick();
        const text = post.getByRole('textbox', { name: /^Edit / });
        await expect(text).toBeVisible();
        await text.fill('Canvas footer in progress');

        const beforeDesign = await state();
        const stylesheetLinks = await nativeTool<{
          matches: Array<{ path: string; text: string }>;
        }>(page, 'ghost_canvas_read_theme', {
          workspaceId: beforeDesign.workspaceId,
          expectedRevision: beforeDesign.editor.sourceRevision,
          operation: 'search_files',
          query: 'rel="stylesheet"',
        });
        const layoutPath = stylesheetLinks.matches.find(
          (match) => match.path.endsWith('.hbs') && match.text.includes('{{asset'),
        )!.path;
        const layout = await nativeTool<{ content: string; truncated: boolean }>(
          page,
          'ghost_canvas_read_theme',
          {
            workspaceId: beforeDesign.workspaceId,
            expectedRevision: beforeDesign.editor.sourceRevision,
            operation: 'read_file',
            path: layoutPath,
          },
        );
        expect(layout.truncated).toBe(false);
        const design = `
          .gh-header, .site-header-content, .gh-article-header, .article-header {
            border-bottom: 12px solid #e89538;
          }
          .gh-feature-image { border-radius: 32px; }
          .${postTitleClass} {
            font-size: clamp(40px, 6vw, 80px);
            font-weight: 800;
            line-height: 1.05;
            letter-spacing: -.045em;
            text-wrap: balance;
          }
          .canvas-editorial-kicker {
            font-size: 12px;
            font-weight: 700;
            letter-spacing: .16em;
            text-transform: uppercase;
          }
        `;
        const styleLink = layout.content
          .replace(/^\d+: /gm, '')
          .split('\n')
          .find((line) => line.includes('rel="stylesheet"') && line.includes('{{asset'))!;

        // Hold real Content API responses while the worker renders the candidate.
        // Forward them unchanged; accepted live pages stay interactive meanwhile.
        let heldCandidate = false;
        let holding = true;
        const held = new Promise<void>((resolve) => {
          releaseCandidate = resolve;
        });
        await page.context().route('**/ghost/api/content/posts/**', async (route) => {
          if (holding) {
            heldCandidate = true;
            await held;
          }
          await route.continue();
        });
        changing = nativeTool(page, 'ghost_canvas_apply_theme_patch', {
          workspaceId: beforeDesign.workspaceId,
          expectedRevision: beforeDesign.editor.sourceRevision,
          expectedDataGeneration: beforeDesign.editor.render.dataGeneration,
          files: [
            {
              operation: 'replace',
              path: layoutPath,
              oldText: styleLink,
              newText: `${styleLink}\n<link rel="stylesheet" href="{{asset "css/canvas-design.css"}}">`,
            },
            { operation: 'write', path: 'assets/css/canvas-design.css', content: design },
          ],
        });
        void changing.catch(() => {});
        await expect.poll(() => heldCandidate).toBe(true);
        expect((await state()).editor.busy).toBe(true);
        await text.fill('Canvas footer');
        await nativeTool(page, 'ghost_canvas_reveal_frame', {
          workspaceId: beforeDesign.workspaceId,
          expectedRevision: beforeDesign.editor.sourceRevision,
          frameId: 'home-mobile',
        });
        expect((await state()).editor.manualDraft).toMatchObject({ text: 'Canvas footer' });
        holding = false;
        releaseCandidate();
        await changing;
        await ready();
        expect((await state()).editor.manualDraft).toMatchObject({ text: 'Canvas footer' });
        await assertImages();
        for (const label of labels) {
          await expect(
            page
              .frameLocator(`iframe[title="${label} composition"]`)
              .locator(heroSelector(theme, label)),
          ).toHaveCSS('border-bottom-width', '12px');
        }
        for (const label of ['Post · Desktop', 'Post · Mobile']) {
          await expect(
            page
              .frameLocator(`iframe[title="${label} composition"]`)
              .getByRole('heading', { level: 1 }),
          ).toHaveCSS('font-size', label.endsWith('Desktop') ? '80px' : '40px');
        }
        await page.getByRole('button', { name: 'Resume text draft', exact: true }).click();
        await text.press('Enter');
        await ready();
        await expect(page.getByRole('button', { name: 'Undo theme change' })).toBeEnabled();
        await expect(post.getByText('Canvas footer', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Undo theme change' }).click();
        await expect(post.getByText('Canvas draft footer', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Redo theme change' }).click();
        await expect(post.getByText('Canvas footer', { exact: true })).toBeVisible();
        await ready();

        const beforePost = await state();
        const targetPost = [first, second].find(
          (candidate) => candidate.id !== beforePost.editor.render.representativePost.id,
        )!;
        await page.getByRole('button', { name: 'Choose preview Post', exact: true }).click();
        await page
          .getByRole('button', { name: `Use Post: ${targetPost.title}`, exact: true })
          .click();
        await ready();
        expect((await state()).editor.sourceRevision).toBe(beforePost.editor.sourceRevision);
        expect((await state()).editor.history).toEqual(beforePost.editor.history);
        for (const label of ['Post · Desktop', 'Post · Mobile']) {
          for (const kind of ['composition', 'preview']) {
            await expect(
              page
                .frameLocator(`iframe[title="${label} ${kind}"]`)
                .getByRole('heading', { name: targetPost.title, exact: true, level: 1 }),
            ).toBeVisible();
          }
        }
        await page.getByRole('button', { name: 'Theme settings', exact: true }).click();
        await page.getByRole('combobox', { name: 'Title font', exact: true }).click();
        await page.getByRole('option', { name: 'Elegant serif', exact: true }).click();
        await page.getByRole('button', { name: 'Apply settings', exact: true }).click();
        await ready();
        await page.keyboard.press('Escape');
        await page.getByRole('button', { name: 'Undo theme change' }).click();
        await ready();
        await page.getByRole('button', { name: 'Redo theme change' }).click();
        await ready();
        await assertImages();

        const inspected = await state();
        for (const frame of inspected.frames) {
          const captured = await nativeTool<{
            image: { dataUrl: string; width: number; height: number };
            warnings: unknown[];
          }>(page, 'ghost_canvas_probe_capture_frame', {
            workspaceId: inspected.workspaceId,
            frameHandle: frame.frameHandle,
            representationHandle: frame.device.representationHandle,
            expectedRevision: frame.device.revision,
            expectedRenderKey: frame.device.renderKey,
            kind: 'viewport',
          });
          expect(captured.image).toMatchObject({ width: frame.width, height: frame.height });
          await writeFile(
            testInfo.outputPath(`${theme}-${frame.id}-native.png`),
            Buffer.from(captured.image.dataUrl.split(',')[1], 'base64'),
          );
          await testInfo.attach(`${theme}-${frame.id}-capture-warnings`, {
            body: JSON.stringify(captured.warnings),
            contentType: 'application/json',
          });
        }
        expect((await state()).view).toEqual(inspected.view);

        // Native capture reports unreadable external pixels. Also inspect the real
        // live device views, without changing image loading or sandbox policy.
        await page.getByRole('button', { name: 'Device viewports', exact: true }).click();
        for (const frame of inspected.frames) {
          await nativeTool(page, 'ghost_canvas_reveal_frame', {
            workspaceId: inspected.workspaceId,
            expectedRevision: inspected.editor.sourceRevision,
            frameId: frame.id,
          });
          const label = labels.find((item) => item.toLowerCase().replace(' · ', '-') === frame.id)!;
          const device = page.getByTitle(`${label} preview`, { exact: true });
          const bounds = await device.boundingBox();
          expect(bounds).toMatchObject({ width: frame.width, height: frame.height });
          await device.screenshot({ path: testInfo.outputPath(`${theme}-${frame.id}-live.png`) });
        }
        await page.getByRole('button', { name: 'Live compositions', exact: true }).click();
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();

        await post.getByText('Canvas footer', { exact: true }).dblclick();
        await post.getByRole('textbox', { name: /^Edit / }).fill('Private footer draft');

        await expect(
          page.getByRole('button', { name: 'Publish changes', exact: true }),
        ).toBeEnabled();
        const current = await nativeTool<CanvasState>(
          page,
          'ghost_canvas_probe_get_editor_state',
          {},
        );
        await nativeTool(page, 'ghost_canvas_open_publication_review', {
          workspaceId: current.workspaceId,
          expectedRevision: current.editor.sourceRevision,
        });
        const review = page.getByRole('alertdialog');
        await expect(review.getByText(/changed file/)).toBeVisible();
        await expect(review.getByText(/changed setting/)).toBeVisible();
        await expect(
          review.getByText('Pending text is excluded and will be kept.', { exact: true }),
        ).toBeVisible();
        await review.getByLabel('Theme copy name').fill(copyName);
        await review.getByRole('button', { name: 'Publish and activate copy' }).click();
        await expect(review).toBeHidden();
        const published = await page.request.get('/');
        expect(published.status()).toBe(200);
        expect(await published.text()).toContain('Canvas footer');
        for (const url of ['/', `/${first.slug}/`, `/${second.slug}/`]) {
          const response = await page.request.get(url);
          expect(response.status()).toBe(200);
          const html = await response.text();
          const stylesheetUrl = html.match(/href="([^"]*canvas-design\.css[^"]*)"/)?.[1];
          expect(stylesheetUrl).toBeTruthy();
          const stylesheet = await page.request.get(new URL(stylesheetUrl!, response.url()).href);
          expect(stylesheet.status()).toBe(200);
          const css = await stylesheet.text();
          expect(css).toContain('border-bottom: 12px solid #e89538');
          expect(css).toContain('font-size: clamp(40px, 6vw, 80px)');
          expect(html).toContain('canvas-landscape');
          expect(html).toContain('Canvas footer');
          expect(html).not.toContain('Private footer draft');
          expect(html).toContain('has-serif-title');
        }
        for (const url of [`/${first.slug}/`, `/${second.slug}/`]) {
          const response = await page.request.get(url);
          expect(response.status()).toBe(200);
          expect(await response.text()).toContain('From the journal');
        }
        await ready();
        expect((await state()).editor.manualDraft).toMatchObject({ text: 'Private footer draft' });
        await page.getByRole('button', { name: 'Cancel text draft', exact: true }).click();
        await page.getByRole('button', { name: 'Undo theme change' }).click();
        await ready();
        await expect(
          page.getByRole('heading', { name: `Canvas · ${copyName}`, exact: true }),
        ).toBeVisible();
        await page.getByRole('button', { name: 'Redo theme change' }).click();
        await ready();
        await assertImages();
        for (const label of labels) {
          for (const kind of ['composition', 'preview']) {
            await expect(
              page
                .frameLocator(`iframe[title="${label} ${kind}"]`)
                .getByText('Canvas footer', { exact: true }),
            ).toHaveText('Canvas footer');
          }
        }
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        await page.screenshot({ path: testInfo.outputPath(`${theme}-published-overview.png`) });
      } finally {
        releaseCandidate();
        await changing?.catch(() => {});
        const restored = await page.request.put(`/ghost/api/admin/themes/${theme}/activate/`);
        expect(restored.ok()).toBe(true);
        const removed = await page.request.delete(`/ghost/api/admin/themes/${copyName}/`);
        expect(removed.ok() || removed.status() === 404).toBe(true);
      }
    });
  }
});
