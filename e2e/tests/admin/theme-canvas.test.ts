import { createPostFactory, createTagFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { randomUUID } from 'node:crypto';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';
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
    render: {
      dataGeneration: number;
      errorPreview: { template: string; url: string; status: 404 } | null;
      representativePost: { id: string };
      representativeContent: Record<string, { id: string; url: string }>;
    };
    history: unknown;
    selection: {
      target: Record<string, unknown>;
      context: { data: { occurrence: string; source: { path: string; line: number } } };
    } | null;
  };
  frames: Array<{
    id: string;
    label: string;
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

// These journeys build driver addresses and patches; translate them to the compact
// public context. New catalog/batch/default-wait contracts have direct coverage.
function siteInput(mode: string, input: Record<string, unknown>): Record<string, unknown> {
  const { workspaceId, expectedRevision, expectedDataGeneration = 0, ...rest } = input;
  const context = { workspaceId, revision: expectedRevision, generation: expectedDataGeneration };
  if (mode === 'inspect') {
    return { target: input };
  }
  if (mode === 'element') {
    const { occurrence, ...target } = input;
    return { target, occurrence };
  }
  if (mode === 'edit' || mode === 'dryRun') {
    return { context, ...rest, ...(mode === 'dryRun' ? { dryRun: true } : { wait: false }) };
  }
  if (mode === 'reveal') {
    return { context, frame: rest.frameId };
  }
  if (mode === 'review') {
    return { context };
  }
  if (mode === 'history') {
    const { checkpointId, ...other } = rest;
    return {
      context,
      ...other,
      ...(checkpointId !== undefined ? { checkpoint: checkpointId } : {}),
    };
  }
  if (mode === 'read') {
    const { operation, ...request } = rest;
    return {
      context,
      requests: [
        {
          ...request,
          operation:
            operation === 'read_file'
              ? 'source'
              : operation === 'list_files'
                ? 'files'
                : operation === 'search_files'
                  ? 'search'
                  : operation,
        },
      ],
    };
  }
  const { expectedTemplate, ...content } = rest;
  return {
    context,
    ...content,
    operation: mode === 'list' || mode === 'posts' ? 'list' : 'select',
    ...(mode === 'posts' || mode === 'post' ? { kind: 'post' } : {}),
    ...(expectedTemplate !== undefined ? { template: expectedTemplate } : {}),
  };
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
  if (name === 'ghost_canvas_read') {
    const batch = result.data as { results: { status: string; data: T }[] };
    expect(batch.results[0]).toMatchObject({ status: 'ok' });
    return batch.results[0].data;
  }
  return result.data;
}

async function errorTemplateSource(
  page: Page,
  theme: string,
  current: CanvasState,
): Promise<string> {
  if (theme === 'source') {
    return '{{!< default}}\n<main><h1>{{statusCode}}</h1><p>{{message}}</p></main>';
  }
  const source = await nativeTool<{ content: string; truncated: boolean }>(
    page,
    'ghost_canvas_read',
    siteInput('read', {
      workspaceId: current.workspaceId,
      expectedRevision: current.editor.sourceRevision,
      operation: 'read_file',
      path: 'error-404.hbs',
    }),
  );
  expect(source.truncated).toBe(false);
  return source.content.replace(/^\d+: /gm, '');
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

async function revealCanvasText(page: Page, label: string, text: string) {
  const composition = page.getByTitle(`${label} composition`, { exact: true });
  await expect(composition).toHaveAttribute('data-composition-status', 'settled');
  await page.getByRole('button', { name: label, exact: true }).dblclick();
  await expect(composition).toHaveAttribute('data-composition-status', 'settled');
  const target = page
    .frameLocator(`iframe[title="${label} composition"]`)
    .getByText(text, { exact: true });
  const bounds = await target.boundingBox();
  expect(bounds).not.toBeNull();
  const viewport = page.viewportSize()!;
  // A full-page iframe does not scroll its enclosing canvas. Pan to below-fold text.
  await page
    .getByRole('region', { name: 'Theme canvas', exact: true })
    .hover({ position: { x: 8, y: 64 } });
  await page.mouse.wheel(0, bounds!.y + bounds!.height / 2 - viewport.height / 2);
  await expect
    .poll(async () => {
      const current = await target.boundingBox();
      return !!current && current.y >= 0 && current.y + current.height < viewport.height;
    })
    .toBe(true);
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
      const reloadSignals: Array<{ url: string; payload: string }> = [];
      page.on('websocket', (socket) =>
        socket.on('framereceived', (event) => {
          const payload = String(event.payload);
          if (payload.includes('reload')) {
            reloadSignals.push({ url: socket.url(), payload: payload.slice(0, 2000) });
          }
        }),
      );
      test.slow(); // Full shared design, content switching, image inspection and publication journey.
      const cover = await uploadCover(page);
      const settings = await page.request.put('/ghost/api/admin/settings/', {
        data: { settings: [{ key: 'cover_image', value: cover }] },
      });
      expect(settings.ok()).toBe(true);
      const posts = createPostFactory(page.request);
      const tag = await createTagFactory(page.request).create({
        name: 'Canvas archive',
        slug: 'canvas-archive',
        feature_image: cover,
      });
      const pageData = posts.build({
        title: 'About the canvas',
        slug: 'canvas-about',
        type: 'page',
        status: 'published',
        feature_image: cover,
      });
      const createdPage = await page.request.post('/ghost/api/admin/pages/', {
        data: { pages: [pageData] },
      });
      expect(createdPage.ok()).toBe(true);
      const first = await posts.create({
        title: 'Canvas published article',
        custom_template: 'custom-canvas',
        tags: [{ id: tag.id }],
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
        const labels = ['Home', 'Post', 'Page', 'Tag', 'Author', '404'].flatMap((group) => [
          `${group} · Desktop`,
          `${group} · Mobile`,
        ]);
        const state = () => nativeTool<CanvasState>(page, 'ghost_canvas_state', {});
        const ready = async () => {
          await expect.poll(async () => !(await state()).editor.busy).toBe(true);
          const current = await state();
          const expectedTitles = labels
            .filter(
              (value) => !value.startsWith('404') || current.editor.render.errorPreview !== null,
            )
            .flatMap((label) => ['composition', 'preview'].map((kind) => `${label} ${kind}`));
          await expect
            .poll(() =>
              page.getByTitle(/ · (Desktop|Mobile) (composition|preview)$/).evaluateAll(
                (iframes, titles) =>
                  titles.map((title) => {
                    const matching = iframes.filter(
                      (element) => element.getAttribute('title') === title,
                    );
                    return {
                      title,
                      count: matching.length,
                      status: matching[0]?.getAttribute('data-preview-status') ?? null,
                    };
                  }),
                expectedTitles,
              ),
            )
            .toEqual(expectedTitles.map((title) => ({ title, count: 1, status: 'Ready' })));
        };
        const assertImages = async () => {
          for (const label of labels.filter(
            (value) => value.startsWith('Home') || value.startsWith('Post'),
          )) {
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
        await expect(page.getByText('This theme has no custom 404 template.').first()).toBeVisible({
          visible: theme === 'source',
        });
        const initial = await nativeTool<CanvasState>(page, 'ghost_canvas_state', {});
        await nativeTool(
          page,
          'ghost_canvas_reveal',
          siteInput('reveal', {
            workspaceId: initial.workspaceId,
            expectedRevision: initial.editor.sourceRevision,
            frameId: 'home-mobile',
          }),
        );
        const home = page.frameLocator('iframe[title="Home · Mobile composition"]');
        await expect(home.getByRole('heading', { name: 'Canvas published article' })).toBeVisible();
        await page.getByRole('region', { name: 'Theme canvas' }).press('f');
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
        }>(
          page,
          'ghost_canvas_inspect',
          siteInput('element', {
            ...selection.target,
            occurrence: selection.context.data.occurrence,
          }),
        );
        expect(inspectedHeading.element.source).toMatchObject(selection.context.data.source);
        const selectedSource = await nativeTool<{ content: string; truncated: boolean }>(
          page,
          'ghost_canvas_read',
          siteInput('read', {
            workspaceId: selected.workspaceId,
            expectedRevision: selected.editor.sourceRevision,
            operation: 'read_file',
            path: inspectedHeading.element.source.path,
          }),
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
        await nativeTool(page, 'ghost_canvas_edit', siteInput('dryRun', headingPatch));
        expect((await state()).editor.sourceRevision).toBe(selected.editor.sourceRevision);
        await nativeTool(page, 'ghost_canvas_edit', siteInput('edit', headingPatch));
        await ready();
        await expect(post.getByText('From the journal', { exact: true })).toBeVisible();
        const postTitleClass = inspectedHeading.element.attributes.class.split(' ')[0];

        // Installed Source translates its copyright link; edit source through native
        // WebMCP, then use the literal added by that edit for direct manual editing.
        const beforeFooter = await nativeTool<CanvasState>(page, 'ghost_canvas_state', {});
        const address = {
          workspaceId: beforeFooter.workspaceId,
          expectedRevision: beforeFooter.editor.sourceRevision,
        };
        const source = await nativeTool<{ content: string; truncated: boolean }>(
          page,
          'ghost_canvas_read',
          siteInput('read', {
            ...address,
            operation: 'read_file',
            path,
          }),
        );
        expect(source.truncated).toBe(false);
        expect(source.content).toContain('</footer>');
        const template = source.content.replace(/^\d+: /gm, '');
        await nativeTool(
          page,
          'ghost_canvas_edit',
          siteInput('edit', {
            ...address,
            expectedDataGeneration: beforeFooter.editor.render.dataGeneration,
            files: [
              {
                operation: 'write',
                path,
                content: template.replace('</footer>', '<p>Canvas draft footer</p></footer>'),
              },
            ],
          }),
        );
        await expect(post.getByText('Canvas draft footer', { exact: true })).toBeVisible();
        await ready();
        await expect(page.getByRole('button', { name: 'Undo theme change' })).toBeEnabled();
        await page.getByRole('region', { name: 'Theme canvas' }).press('f');
        await revealCanvasText(page, 'Post · Mobile', 'Canvas draft footer');
        await post.getByText('Canvas draft footer', { exact: true }).dblclick();
        const text = post.getByRole('textbox', { name: /^Edit / });
        await expect(text).toBeVisible();
        await text.fill('Canvas footer in progress');

        const beforeDesign = await state();
        const stylesheetLinks = await nativeTool<{
          matches: Array<{ path: string; text: string }>;
        }>(
          page,
          'ghost_canvas_read',
          siteInput('read', {
            workspaceId: beforeDesign.workspaceId,
            expectedRevision: beforeDesign.editor.sourceRevision,
            operation: 'search_files',
            query: 'rel="stylesheet"',
          }),
        );
        const layoutPath = stylesheetLinks.matches.find(
          (match) => match.path.endsWith('.hbs') && match.text.includes('{{asset'),
        )!.path;
        const layout = await nativeTool<{ content: string; truncated: boolean }>(
          page,
          'ghost_canvas_read',
          siteInput('read', {
            workspaceId: beforeDesign.workspaceId,
            expectedRevision: beforeDesign.editor.sourceRevision,
            operation: 'read_file',
            path: layoutPath,
          }),
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

        const postTemplate = await nativeTool<{ content: string; truncated: boolean }>(
          page,
          'ghost_canvas_read',
          siteInput('read', {
            workspaceId: beforeDesign.workspaceId,
            expectedRevision: beforeDesign.editor.sourceRevision,
            operation: 'read_file',
            path: 'post.hbs',
          }),
        );
        expect(postTemplate.truncated).toBe(false);
        const variantSource = postTemplate.content.replace(/^\d+: /gm, '');
        const errorSource = await errorTemplateSource(page, theme, beforeDesign);

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
        changing = nativeTool(
          page,
          'ghost_canvas_edit',
          siteInput('edit', {
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
              {
                operation: 'write',
                path: 'error-404.hbs',
                content: `${errorSource}\n<p>Error canvas variation</p>`,
              },
              {
                operation: 'write',
                path: 'custom-canvas.hbs',
                content: `${variantSource}\n<p>Custom canvas variation</p>`,
              },
              {
                operation: 'write',
                path: 'page-canvas-about.hbs',
                content: `${variantSource}\n<p>Slug canvas variation</p>`,
              },
            ],
          }),
        );
        void changing.catch(() => {});
        await expect.poll(() => heldCandidate).toBe(true);
        expect((await state()).editor.busy).toBe(true);
        await text.fill('Canvas footer');
        await nativeTool(
          page,
          'ghost_canvas_reveal',
          siteInput('reveal', {
            workspaceId: beforeDesign.workspaceId,
            expectedRevision: beforeDesign.editor.sourceRevision,
            frameId: 'home-mobile',
          }),
        );
        expect((await state()).editor.manualDraft).toMatchObject({ text: 'Canvas footer' });
        holding = false;
        releaseCandidate();
        await changing;
        await ready();
        expect((await state()).editor.render.errorPreview).toMatchObject({
          template: 'error-404.hbs',
          status: 404,
        });
        for (const label of labels.filter((value) => value.startsWith('404'))) {
          for (const kind of ['composition', 'preview']) {
            await expect(
              page
                .frameLocator(`iframe[title="${label} ${kind}"]`)
                .getByText('Error canvas variation', { exact: true }),
            ).toHaveText('Error canvas variation');
          }
        }
        expect((await state()).editor.manualDraft).toMatchObject({ text: 'Canvas footer' });
        await assertImages();
        for (const label of labels.filter(
          (value) => value.startsWith('Home') || value.startsWith('Post'),
        )) {
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
        const beforeVariant = await state();
        const variants = await nativeTool<{
          templates: Array<{ path: string; items: Array<{ id: string }> }>;
        }>(
          page,
          'ghost_canvas_content',
          siteInput('list', {
            workspaceId: beforeVariant.workspaceId,
            expectedRevision: beforeVariant.editor.sourceRevision,
            kind: 'post',
          }),
        );
        expect(
          variants.templates.find((choice) => choice.path === 'custom-canvas.hbs')?.items,
        ).toContainEqual(expect.objectContaining({ id: first.id }));
        await nativeTool(
          page,
          'ghost_canvas_content',
          siteInput('select', {
            workspaceId: beforeVariant.workspaceId,
            expectedRevision: beforeVariant.editor.sourceRevision,
            expectedDataGeneration: beforeVariant.editor.render.dataGeneration,
            kind: 'post',
            id: first.id,
            expectedTemplate: 'custom-canvas.hbs',
          }),
        );
        await ready();
        expect((await state()).editor.history).toEqual(beforeVariant.editor.history);
        await page.getByRole('region', { name: 'Theme canvas' }).press('f');
        await page.getByRole('button', { name: 'Page · Desktop', exact: true }).dblclick();
        await page
          .getByRole('button', { name: 'Choose preview Page', exact: true })
          .first()
          .click();
        await page
          .getByRole('button', { name: 'Use template: page-canvas-about.hbs', exact: true })
          .click();
        await ready();
        for (const label of ['Page · Desktop', 'Page · Mobile']) {
          for (const kind of ['composition', 'preview']) {
            await expect(
              page
                .frameLocator(`iframe[title="${label} ${kind}"]`)
                .getByText('Slug canvas variation', { exact: true }),
            ).toHaveText('Slug canvas variation');
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
        expect((await state()).view).toEqual(inspected.view);

        // Capture the actual live device pixels through the browser. No snapshot iframe.
        await page.getByRole('button', { name: 'Device viewports', exact: true }).click();
        for (const frame of inspected.frames) {
          await nativeTool(
            page,
            'ghost_canvas_reveal',
            siteInput('reveal', {
              workspaceId: inspected.workspaceId,
              expectedRevision: inspected.editor.sourceRevision,
              frameId: frame.id,
            }),
          );
          const label = frame.label;
          const device = page.getByTitle(`${label} preview`, { exact: true });
          const bounds = await device.boundingBox();
          expect(bounds).toMatchObject({ width: frame.width, height: frame.height });
          await device.screenshot({ path: testInfo.outputPath(`${theme}-${frame.id}-live.png`) });
        }
        await page.getByRole('button', { name: 'Live compositions', exact: true }).click();
        await page.getByRole('region', { name: 'Theme canvas' }).press('f');

        await revealCanvasText(page, 'Post · Mobile', 'Canvas footer');
        await post.getByText('Canvas footer', { exact: true }).dblclick();
        await post.getByRole('textbox', { name: /^Edit / }).fill('Private footer draft');

        await expect(
          page.getByRole('button', { name: 'Publish changes', exact: true }),
        ).toBeEnabled();
        const current = await nativeTool<CanvasState>(page, 'ghost_canvas_state', {});
        await nativeTool(
          page,
          'ghost_canvas_review',
          siteInput('review', {
            workspaceId: current.workspaceId,
            expectedRevision: current.editor.sourceRevision,
          }),
        );
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
        const liveCustom = await page.request.get(`/${first.slug}/`);
        expect(await liveCustom.text()).toContain('Custom canvas variation');
        const liveSlug = await page.request.get('/canvas-about/');
        expect(await liveSlug.text()).toContain('Slug canvas variation');
        const errorUrl = (await state()).editor.render.errorPreview!.url;
        const liveError = await page.request.get(errorUrl);
        expect(liveError.status()).toBe(404);
        const errorHtml = await liveError.text();
        expect(errorHtml).toContain('Error canvas variation');
        expect(errorHtml).toContain('Canvas footer');
        expect(errorHtml).toContain('canvas-design.css');
        const authorUrl = (await state()).editor.render.representativeContent.author.url;
        for (const url of [
          '/',
          `/${first.slug}/`,
          `/${second.slug}/`,
          '/canvas-about/',
          '/tag/canvas-archive/',
          authorUrl,
        ]) {
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
          expect(html).toContain('Canvas footer');
          expect(html).not.toContain('Private footer draft');
          expect(html).toContain('has-serif-title');
        }
        for (const url of [
          '/',
          `/${first.slug}/`,
          `/${second.slug}/`,
          '/canvas-about/',
          '/tag/canvas-archive/',
        ]) {
          const response = await page.request.get(url);
          expect(response.status()).toBe(200);
          expect(await response.text()).toContain('canvas-landscape');
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
        await page.getByRole('region', { name: 'Theme canvas' }).press('f');
        await page.screenshot({ path: testInfo.outputPath(`${theme}-published-overview.png`) });
      } catch (error) {
        await testInfo.attach('canvas-failure-probe', {
          body: JSON.stringify(
            await nativeTool<CanvasState>(page, 'ghost_canvas_state', {}).catch((failure) => ({
              error: String(failure),
            })),
          ),
          contentType: 'application/json',
        });
        await testInfo.attach('canvas-reload-signals', {
          body: JSON.stringify(reloadSignals),
          contentType: 'application/json',
        });
        await testInfo.attach('canvas-failure-state', {
          body: JSON.stringify(
            await page.evaluate(() => ({
              url: location.href,
              canvas: !!document.querySelector('[aria-label="Theme canvas"]'),
              tools: (
                navigator as Navigator & { modelContextTesting?: { listTools(): unknown } }
              ).modelContextTesting?.listTools(),
              text: document.body.innerText.slice(-3000),
            })),
          ),
          contentType: 'application/json',
        });
        throw error;
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
