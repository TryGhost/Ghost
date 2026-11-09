// @vitest-environment node
import { readFileSync } from 'node:fs';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import ts from 'typescript';
import { build, parseAst } from 'vite';
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

function exportsOf(file: string): string[] {
  return [...nodes(parseAst(readFileSync(file, 'utf8')))]
    .filter((node) => node.type === 'ExportSpecifier')
    .map((node) => (node as unknown as { exported: { name: string } }).exported.name)
    .sort();
}

describe('the build', () => {
  // Vite would stub the builtin out, and the module would break the page that loaded it.
  it.each(['package', 'production'])('refuses a Node builtin, in %s mode', async (mode) => {
    const directory = await mkdtemp(join(tmpdir(), 'app-sdk-'));
    const entry = join(directory, 'entry.js');
    await writeFile(
      entry,
      "import { randomUUID } from 'node:crypto';\nexport const id = randomUUID();\n",
    );
    try {
      const building = build({
        root: fileURLToPath(new URL('..', import.meta.url)),
        mode,
        logLevel: 'silent',
        build: { write: false, lib: { entry, formats: ['es'] } },
      });
      await expect(building).rejects.toThrow('node:crypto, a Node builtin no page can load');
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});

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
  const code = join(built.package, 'index.js');
  const declarations = join(built.package, 'index.d.ts');

  // An app installs the SDK with only @quilted/threads: the parts of the contracts it uses
  // are inlined.
  it('imports @quilted/threads and nothing else', () => {
    expect(new Set(importsOf(code))).toEqual(new Set(['@quilted/threads']));
  });

  it('exports connect and its error', () => {
    expect(exportsOf(code)).toEqual(['GhostAppError', 'connect']);
  });

  it('declares its types without importing or referring to any other package', () => {
    const source = ts.createSourceFile(
      declarations,
      readFileSync(declarations, 'utf8'),
      ts.ScriptTarget.ES2022,
    );
    const imports: string[] = [];
    const visit = (node: ts.Node) => {
      if ((ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) && node.moduleSpecifier) {
        imports.push(node.moduleSpecifier.getText(source));
      } else if (ts.isImportTypeNode(node)) {
        imports.push(node.argument.getText(source));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);

    expect(imports).toEqual([]);
    expect(source.referencedFiles).toEqual([]);
    expect(source.typeReferenceDirectives).toEqual([]);
  });

  // Type-checking against the DOM lib is quick locally, but can time out on a CPU-constrained
  // CI runner.
  it('declares every type it exports, with nothing missing', { timeout: 60_000 }, () => {
    const program = ts.createProgram([declarations], {
      strict: true,
      noEmit: true,
      types: [],
      lib: ['lib.es2022.d.ts', 'lib.dom.d.ts'],
    });
    const diagnostics = ts
      .getPreEmitDiagnostics(program)
      .map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
    expect(diagnostics).toEqual([]);

    const checker = program.getTypeChecker();
    const module = checker.getSymbolAtLocation(program.getSourceFile(declarations) as ts.Node);
    const exported = checker.getExportsOfModule(module as ts.Symbol).map((symbol) => symbol.name);
    expect(exported.sort()).toEqual(
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
      ].sort(),
    );
  });
});
