/// <reference types="node" />
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { findUnresolvedImports } from '../../../scripts/check-declarations';

describe('findUnresolvedImports', () => {
  let typesDir: string;

  beforeEach(async () => {
    typesDir = await mkdtemp(join(tmpdir(), 'shade-types-'));
    await mkdir(join(typesDir, 'components', 'ui'), { recursive: true });
    await writeFile(join(typesDir, 'components', 'ui', 'button.d.ts'), 'export {};');
    await writeFile(join(typesDir, 'components', 'ui', 'index.d.ts'), 'export {};');
  });

  afterEach(async () => {
    await rm(typesDir, { recursive: true, force: true });
  });

  it('accepts imports of emitted declarations', async () => {
    await writeFile(
      join(typesDir, 'components.d.ts'),
      [
        "export * from './components/ui/button';",
        "export { Button } from './components/ui/button.js';",
        "export type { UI } from './components/ui';",
        "export type Lazy = typeof import('./components/ui/button');",
      ].join('\n'),
    );

    expect(await findUnresolvedImports(typesDir)).toEqual([]);
  });

  it('reports asset and missing module imports', async () => {
    await writeFile(
      join(typesDir, 'components.d.ts'),
      [
        "export { default as GhostLogo } from './assets/images/ghost-logo.svg?react';",
        "export * from './components/ui/missing';",
        "export * from './components/ui/button';",
      ].join('\n'),
    );

    expect(await findUnresolvedImports(typesDir)).toEqual([
      'components.d.ts imports ./assets/images/ghost-logo.svg?react',
      'components.d.ts imports ./components/ui/missing',
    ]);
  });
});
