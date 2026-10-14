// @vitest-environment node
import { existsSync, readFileSync } from 'node:fs';

import { parseAst } from 'vite';
import { describe, expect, it } from 'vitest';

// Built by `pnpm build:bundle`, which `test:unit` runs first.
const BUNDLE = new URL('../dist/app-sdk.js', import.meta.url);

/** Every node in a tree, so an `import()` nested anywhere is found. */
function* nodes(value: unknown): Generator<{ type: string }> {
  if (Array.isArray(value)) {
    for (const item of value) {
      yield* nodes(item);
    }
  } else if (typeof value === 'object' && value !== null) {
    if (typeof (value as { type?: unknown }).type === 'string') {
      yield value as { type: string };
    }
    for (const child of Object.values(value)) {
      yield* nodes(child);
    }
  }
}

// A page loads the bundle with nothing to resolve a bare specifier against, so any import left
// in it breaks every app. The source is parsed rather than searched, as comments inlined from
// dependencies mention `import(` too. Node builtins are refused by the build (vite.config.ts).
describe('the browser bundle', () => {
  it('has been built', () => {
    expect(existsSync(BUNDLE), 'run pnpm build:bundle first').toBe(true);
  });

  const program = existsSync(BUNDLE) ? parseAst(readFileSync(BUNDLE, 'utf8')) : undefined;

  it('imports nothing', () => {
    const imports = [...nodes(program)].filter(
      (node) =>
        node.type === 'ImportDeclaration' ||
        node.type === 'ImportExpression' ||
        node.type === 'ExportAllDeclaration' ||
        (node.type === 'ExportNamedDeclaration' && (node as { source?: unknown }).source),
    );
    expect(program).toBeDefined();
    expect(imports).toEqual([]);
  });

  it('exports what the package does', () => {
    const exported = [...nodes(program)]
      .filter((node) => node.type === 'ExportSpecifier')
      .map((node) => (node as unknown as { exported: { name: string } }).exported.name);
    expect(exported.sort()).toEqual(['GhostAppError', 'connect']);
  });
});
