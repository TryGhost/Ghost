import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFile } from 'node:fs/promises';
import yaml from 'js-yaml';
import picomatch from 'picomatch';

async function getFilterPatterns(filterName) {
  const workflow = yaml.load(
    await readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
  );
  const filterStep = workflow.jobs.job_setup.steps.find((step) => step.id === 'changed');
  const filters = yaml.load(filterStep.with.filters);

  return filters[filterName].flat(Infinity);
}

describe('CI path filters', () => {
  it('excludes documentation after all positive core patterns', async () => {
    const patterns = await getFilterPatterns('core');
    const positivePatterns = patterns
      .map((pattern, index) => ({ pattern, index }))
      .filter(({ pattern }) => !pattern.startsWith('!'));

    for (const exclusion of [
      '!**/*.md',
      '!**/*.mdx',
      '!ghost/core/server/services/service-inventory.yaml',
    ]) {
      const exclusionIndex = patterns.indexOf(exclusion);
      assert.notStrictEqual(exclusionIndex, -1);
      assert.ok(
        positivePatterns.every(({ index }) => index < exclusionIndex),
        `${exclusion} must follow positive patterns so later patterns cannot add docs back`,
      );
    }
  });

  it('treats Markdown and MDX as documentation rather than code', async () => {
    const docs = await getFilterPatterns('docs');
    const anyCode = await getFilterPatterns('any-code');
    const e2e = await getFilterPatterns('e2e');

    assert.ok(docs.includes('**/*.md'));
    assert.ok(docs.includes('**/*.mdx'));
    assert.ok(anyCode.includes('!**/*.md'));
    assert.ok(anyCode.includes('!**/*.mdx'));
    assert.ok(e2e.includes('!**/*.md'));
    assert.ok(e2e.includes('!**/*.mdx'));
  });

  it('treats the service inventory as docs and keeps code checks for mixed changes', async () => {
    const inventory = 'ghost/core/server/services/service-inventory.yaml';
    const docs = await getFilterPatterns('docs');
    assert.ok(docs.some((pattern) => picomatch(pattern, { dot: true })(inventory)));

    for (const filterName of ['core', 'any-code', 'e2e']) {
      const patterns = await getFilterPatterns(filterName);
      const positives = patterns.filter((pattern) => !pattern.startsWith('!'));
      const exclusions = patterns.filter((pattern) => pattern.startsWith('!'));
      const matches = (path) =>
        (positives.length === 0 ||
          positives.some((pattern) => picomatch(pattern, { dot: true })(path))) &&
        exclusions.every((pattern) => picomatch(pattern, { dot: true })(path));
      const metadata = [inventory, 'ghost/core/server/services/README.md'];

      assert.strictEqual(metadata.some(matches), false, filterName);
      for (const runtime of [
        'ghost/core/server/services/identity-tokens/index.ts',
        'ghost/core/server/services/other-metadata.yaml',
        '.github/workflows/ci.yml',
      ]) {
        assert.strictEqual([...metadata, runtime].some(matches), true, `${filterName}: ${runtime}`);
      }
    }

    const anyCode = await getFilterPatterns('any-code');
    assert.ok(
      anyCode.every((pattern) =>
        picomatch(pattern, { dot: true })(
          'ghost/test/unit/server/services/service-inventory.test.ts',
        ),
      ),
      'Changes to the inventory validator must still run code checks',
    );
  });

  it('requires focused validation for inventory metadata, its test and configuration', async () => {
    const patterns = await getFilterPatterns('service-inventory');
    const matches = (path) => patterns.some((pattern) => picomatch(pattern, { dot: true })(path));
    for (const path of [
      'ghost/core/server/services/service-inventory.yaml',
      'ghost/test/unit/server/services/service-inventory.test.ts',
      'ghost/vitest.config.inventory.ts',
      '.github/workflows/ci.yml',
    ]) {
      assert.strictEqual(matches(path), true, path);
    }
    assert.strictEqual(matches('ghost/core/server/services/README.md'), false);

    const configPath = 'ghost/vitest.config.inventory.ts';
    for (const filterName of ['core', 'e2e']) {
      const filters = await getFilterPatterns(filterName);
      assert.ok(filters.includes(`!${configPath}`), filterName);
    }

    const workflow = yaml.load(
      await readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8'),
    );
    assert.strictEqual(
      workflow.jobs.job_setup.outputs.changed_service_inventory,
      '${{ steps.changed.outputs.service-inventory }}',
    );
    const job = workflow.jobs.job_service_inventory;
    assert.deepStrictEqual(job.needs, ['job_setup']);
    assert.strictEqual(job.if, "needs.job_setup.outputs.changed_service_inventory == 'true'");
    assert.ok(
      job.steps.some(
        (step) =>
          step.run === 'pnpm --filter ghost exec vitest run --config vitest.config.inventory.ts',
      ),
    );
    assert.ok(
      workflow.jobs.job_required_tests.needs.includes('job_service_inventory'),
      'Inventory validation failures must block the required-tests gate',
    );
  });

  it('skips code checks and E2E for ownership and docs changes, but keeps mixed changes', async () => {
    for (const filterName of ['any-code', 'e2e']) {
      const patterns = await getFilterPatterns(filterName);
      const matches = (path) =>
        patterns.every((pattern) => picomatch(pattern, { dot: true })(path));
      const docsPaths = ['.github/CODEOWNERS', 'ghost/core/kernel/README.md'];

      assert.strictEqual(docsPaths.some(matches), false, filterName);
      for (const path of ['ghost/core/index.js', '.github/workflows/ci.yml']) {
        assert.strictEqual([...docsPaths, path].some(matches), true, `${filterName}: ${path}`);
      }
    }
  });

  it('skips the build and E2E lane for Admin tests while keeping affected checks', async () => {
    const e2e = await getFilterPatterns('e2e');
    const anyCode = await getFilterPatterns('any-code');

    // These filters contain only exclusions. The pinned action uses micromatch:
    // a file survives only if it matches every negated glob, with dotfiles enabled.
    for (const patterns of [e2e, anyCode]) {
      assert.ok(patterns.every((pattern) => pattern.startsWith('!')));
    }
    const matches = (patterns, path) =>
      patterns.every((pattern) => picomatch(pattern, { dot: true })(path));
    const testPaths = [
      'apps/admin/src/members/detail/member-event.test.ts',
      'apps/admin/src/tags/tags.acceptance.test.tsx',
      'apps/admin/src/editor/editor.component.test.tsx',
      'apps/admin/src/tags/tags.screen.ts',
      'apps/admin/test-utils/acceptance/setup.ts',
      'apps/admin/test-utils/acceptance/public/mockServiceWorker.js',
      'apps/admin/vitest.acceptance.config.ts',
    ];
    for (const path of testPaths) {
      assert.strictEqual(matches(e2e, path), false, path);
      assert.strictEqual(matches(anyCode, path), true, path);
    }

    const runtimePaths = [
      'apps/admin/src/tags/tags.tsx',
      'apps/admin/src/index.css',
      'apps/admin/src/editor/engine/__fixtures__/index.ts',
      'apps/admin/src/automations/run-history.test-utils.ts',
      'apps/admin/vite.config.ts',
      'apps/admin/vite.shared.ts',
      'apps/admin/tsconfig.app.json',
      'apps/admin/package.json',
      'apps/admin/.env.test',
      'apps/shade/src/components/ui/button.tsx',
      'pnpm-lock.yaml',
      '.github/workflows/ci.yml',
    ];
    for (const path of runtimePaths) {
      assert.strictEqual(matches(e2e, path), true, path);
    }
    assert.strictEqual(
      [...testPaths, ...runtimePaths].some((path) => matches(e2e, path)),
      true,
      'mixed changes must keep the build and E2E lane',
    );
  });
});
