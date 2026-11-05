// @vitest-environment node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

import ts from 'typescript';
import { parseAst } from 'vite';
import { describe, expect, inject, it } from 'vitest';

// Built from the source under test by `test/build.ts`.
const built = inject('built');

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

/**
 * What a module imports, by specifier. The source is parsed rather than searched, as comments
 * inlined from dependencies mention `import(` too.
 */
function importsOf(file: string): string[] {
  return [...nodes(parseAst(readFileSync(file, 'utf8')))]
    .filter(
      (node) =>
        node.type === 'ImportDeclaration' ||
        node.type === 'ImportExpression' ||
        node.type === 'ExportAllDeclaration' ||
        (node.type === 'ExportNamedDeclaration' && (node as { source?: unknown }).source),
    )
    .map((node) => {
      const { source } = node as { source?: { value?: unknown } };
      return String(source?.value);
    });
}

/**
 * Everything a module loads, following its imports of the package's own chunks, by specifier.
 * Only imports of other packages and builtins are listed.
 */
function reachableImports(file: string, seen = new Set<string>()): Set<string> {
  const found = new Set<string>();
  if (seen.has(file)) {
    return found;
  }
  seen.add(file);
  for (const specifier of importsOf(file)) {
    if (specifier.startsWith('.')) {
      for (const inner of reachableImports(join(dirname(file), specifier), seen)) {
        found.add(inner);
      }
    } else {
      found.add(specifier);
    }
  }
  return found;
}

function exportsOf(file: string): string[] {
  return [...nodes(parseAst(readFileSync(file, 'utf8')))]
    .filter((node) => node.type === 'ExportSpecifier')
    .map((node) => (node as unknown as { exported: { name: string } }).exported.name)
    .sort();
}

describe('the browser bundle', () => {
  const bundle = join(built.bundle, 'app-sdk.js');

  // A page loads it with nothing to resolve a bare specifier against, so any import left in
  // it breaks every app.
  it('imports nothing', () => {
    expect(importsOf(bundle)).toEqual([]);
  });

  it('exports what the package does', () => {
    expect(exportsOf(bundle)).toEqual(['GhostAppError', 'connect']);
  });
});

describe('the package', () => {
  const code = (entry: string) => join(built.package, `${entry}.js`);
  const declarations = (entry: string) => join(built.package, `${entry}.d.ts`);

  // An app installs the SDK with only its dependencies: the parts of the contracts it uses are
  // inlined. The page's SDK loads none of jose, zod or the contracts' validation, and a
  // backend no Node builtin, so it runs on any platform.
  it.each([
    ['index', ['@quilted/threads']],
    ['backend', ['jose', 'zod']],
  ])('%s.js loads only %j, through every chunk it imports', (entry, packages) => {
    expect(reachableImports(code(entry))).toEqual(new Set(packages));
  });

  it("keeps the page's SDK free of the contracts' validation", () => {
    const loaded = [...reachableImports(code('index'))].join();
    expect(loaded).not.toMatch(/jose|zod|node:/);
  });

  it.each([
    ['tooling', ['jose', 'zod']],
    ['bin', ['jose', 'zod', 'commander']],
    ['vite', ['jose', 'zod', 'vite']],
  ])('%s.js loads only Node builtins and %j', (entry, packages) => {
    const loaded = [...reachableImports(code(entry))].filter(
      (specifier) => !specifier.startsWith('node:'),
    );
    expect(new Set(loaded)).toEqual(new Set(packages));
  });

  // Vite is an optional peer dependency, so the plugin imports it only when Vite runs it, and
  // the entry point loads without it.
  it('imports Vite from the plugin only when Vite runs it', () => {
    const imports = [...nodes(parseAst(readFileSync(code('vite'), 'utf8')))]
      .filter((node) => node.type === 'ImportDeclaration')
      .map((node) => String((node as { source?: { value?: unknown } }).source?.value));
    expect(imports).not.toContain('vite');
  });

  it('runs the CLI with Node', () => {
    expect(readFileSync(code('bin'), 'utf8').split('\n')[0]).toBe('#!/usr/bin/env node');
  });

  it.each([
    ['index', ['GhostAppError', 'connect']],
    [
      'backend',
      [
        'CHALLENGE_PATH',
        'MANIFEST_PATH',
        'allowFraming',
        'handleChallenge',
        'serveManifest',
        'withGhostApp',
      ],
    ],
    ['vite', ['ghostApp']],
  ])('%s.js exports %j', (entry, names) => {
    expect(exportsOf(code(entry))).toEqual(names);
  });

  it.each([
    ['index', []],
    ['backend', []],
    ['tooling', []],
    ['vite', ['"vite"']],
  ])(
    '%s.d.ts declares its types without importing or referring to any other package but %j',
    (entry, expected) => {
      // The package's own declaration chunks, which entry points share, are followed.
      const imports: string[] = [];
      const seen = new Set<string>();
      const read = (file: string) => {
        if (seen.has(file)) {
          return;
        }
        seen.add(file);
        const source = ts.createSourceFile(
          file,
          readFileSync(file, 'utf8'),
          ts.ScriptTarget.ES2022,
        );
        const visit = (node: ts.Node) => {
          let specifier: string | undefined;
          if (
            (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
            node.moduleSpecifier
          ) {
            specifier = node.moduleSpecifier.getText(source);
          } else if (ts.isImportTypeNode(node)) {
            specifier = node.argument.getText(source);
          }
          const own = specifier && /^["']\.\/(.*)\.js["']$/.exec(specifier);
          if (own) {
            read(join(dirname(file), `${own[1]}.d.ts`));
          } else if (specifier) {
            imports.push(specifier);
          }
          ts.forEachChild(node, visit);
        };
        visit(source);
        expect(source.referencedFiles).toEqual([]);
        expect(source.typeReferenceDirectives).toEqual([]);
      };
      read(declarations(entry));

      expect(imports).toEqual(expected);
    },
  );

  // Type-checking against the DOM lib is quick locally, but can time out on a CPU-constrained
  // CI runner. A backend's platform has the same web standards as a page.
  it.each([
    [
      'index',
      [
        'ConnectOptions',
        'Ghost',
        'GhostAppError',
        'GhostAppErrorCode',
        'GhostFetchInit',
        'GhostPath',
        'JsonBody',
        'Place',
        'Session',
        'Site',
        'StartContext',
        'Theme',
        'Unsubscribe',
        'User',
        'connect',
      ],
    ],
    [
      'backend',
      [
        'AllowFramingOptions',
        'BackendKey',
        'CHALLENGE_PATH',
        'FetchHandler',
        'GhostAppOptions',
        'HandleChallengeOptions',
        'MANIFEST_PATH',
        'SignedManifest',
        'allowFraming',
        'handleChallenge',
        'serveManifest',
        'withGhostApp',
      ],
    ],
    ['tooling', undefined],
  ])(
    'declares every type %s exports, with nothing missing',
    { timeout: 60_000 },
    (entry, expected) => {
      const file = declarations(entry);
      const program = ts.createProgram([file], {
        strict: true,
        noEmit: true,
        types: [],
        lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
      });
      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
      expect(diagnostics).toEqual([]);

      if (expected) {
        const checker = program.getTypeChecker();
        const module = checker.getSymbolAtLocation(program.getSourceFile(file) as ts.Node);
        const exported = checker
          .getExportsOfModule(module as ts.Symbol)
          .map((symbol) => symbol.name);
        expect(exported.sort()).toEqual([...expected].sort());
      }
    },
  );
});
