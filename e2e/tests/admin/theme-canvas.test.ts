import { createPostFactory } from '@/data-factory';
import { expect, test } from '@/helpers/playwright';
import { randomUUID } from 'node:crypto';
import { usePerTestIsolation } from '@/helpers/playwright/isolation';
import type { Page } from '@playwright/test';

type NativeTesting = {
  executeTool: (name: string, input: string) => Promise<string | null>;
};
type CanvasState = { workspaceId: string; editor: { sourceRevision: string } };

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
  expect(result).toMatchObject({ status: 'ok' });
  return result.data;
}

usePerTestIsolation();
test.use({
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
      const posts = createPostFactory(page.request);
      await posts.create({ title: 'Canvas published article', status: 'published' });
      const activated = await page.request.put(`/ghost/api/admin/themes/${theme}/activate/`);
      expect(activated.ok()).toBe(true);
      const copyName = `canvas-${theme}-${randomUUID()}`;
      try {
        await page.goto('/ghost/#/builder/theme');
        await expect(page.getByRole('region', { name: 'Theme canvas', exact: true })).toBeVisible();
        const labels = ['Home · Desktop', 'Home · Mobile', 'Post · Desktop', 'Post · Mobile'];
        for (const label of labels) {
          for (const kind of ['composition', 'preview']) {
            await expect(page.getByTitle(`${label} ${kind}`, { exact: true })).toHaveAttribute(
              'data-preview-status',
              'Ready',
            );
          }
        }

        await page.getByRole('button', { name: 'Home · Mobile', exact: true }).dblclick();
        const home = page.frameLocator('iframe[title="Home · Mobile composition"]');
        await expect(home.getByRole('heading', { name: 'Canvas published article' })).toBeVisible();
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        await page.getByRole('button', { name: 'Post · Mobile', exact: true }).dblclick();
        const post = page.frameLocator('iframe[title="Post · Mobile composition"]');
        await expect(post.getByRole('heading', { name: 'Canvas published article' })).toBeVisible();
        await page.screenshot({ path: testInfo.outputPath(`${theme}-live-canvas.png`) });

        // Installed Source translates its copyright link; edit source through native
        // WebMCP, then use the literal added by that edit for direct manual editing.
        const state = await nativeTool<CanvasState>(
          page,
          'ghost_canvas_probe_get_editor_state',
          {},
        );
        const address = {
          workspaceId: state.workspaceId,
          expectedRevision: state.editor.sourceRevision,
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
          expectedDataGeneration: 0,
          files: [
            {
              operation: 'write',
              path,
              content: template.replace('</footer>', '<p>Canvas draft footer</p></footer>'),
            },
          ],
        });
        await expect(post.getByText('Canvas draft footer', { exact: true })).toBeVisible();
        await expect(page.getByRole('button', { name: 'Undo theme change' })).toBeEnabled();
        await page.getByRole('button', { name: 'Fit all', exact: true }).click();
        await post.getByText('Canvas draft footer', { exact: true }).dblclick();
        const text = post.getByRole('textbox', { name: /^Edit / });
        await expect(text).toBeVisible();
        await text.fill('Canvas footer');
        await text.press('Enter');
        await expect(page.getByRole('button', { name: 'Undo theme change' })).toBeEnabled();
        await expect(post.getByText('Canvas footer', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Undo theme change' }).click();
        await expect(post.getByText('Canvas draft footer', { exact: true })).toBeVisible();
        await page.getByRole('button', { name: 'Redo theme change' }).click();
        await expect(post.getByText('Canvas footer', { exact: true })).toBeVisible();

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
        await expect(review.getByText(/1 changed file/)).toBeVisible();
        await review.getByLabel('Theme copy name').fill(copyName);
        await review.getByRole('button', { name: 'Publish and activate copy' }).click();
        await expect(review).toBeHidden();
        const published = await page.request.get('/');
        expect(published.status()).toBe(200);
        expect(await published.text()).toContain('Canvas footer');
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
        const restored = await page.request.put(`/ghost/api/admin/themes/${theme}/activate/`);
        expect(restored.ok()).toBe(true);
        const removed = await page.request.delete(`/ghost/api/admin/themes/${copyName}/`);
        expect(removed.ok() || removed.status() === 404).toBe(true);
      }
    });
  }
});
