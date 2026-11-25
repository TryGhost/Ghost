/// <reference types="node" />

/**
 * Builds Shade's Storybook `.mdx` docs into plain Markdown, which Storybook
 * serves at `/docs/<path>.md` with an `/llms.txt` index (see
 * `scripts/storybook-docs.ts`). The npm package doesn't ship them.
 *
 * Every `src/**\/*.mdx` file becomes `docs/<path>.md`, with a leading `docs/`
 * segment dropped: `src/docs/tokens.mdx` → `docs/tokens.md` and
 * `src/components/patterns/page-header.mdx` →
 * `docs/components/patterns/page-header.md`. `docs/index.md` lists them all.
 *
 * The transform is line- and fence-aware rather than an MDX compile:
 * - import lines and `<Meta>` are removed; `<div>`/`<p>` wrappers are unwrapped;
 * - `<Canvas of={Stories.Name} />` (and `<Story>`/`<Source>`) become the story's
 *   code, read from the stories file with the TypeScript parser;
 * - Storybook and relative links to other `.mdx` docs point at the generated files;
 * - any other JSX or `{expression}` outside a code fence fails the build;
 * - fenced code passes through untouched.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative, resolve, sep } from 'node:path';
import ts from 'typescript';

const SCRIPT = 'scripts/build-docs.ts';

/** Layer subpaths in the order a story import should prefer them. The root barrel is deliberately absent. */
const PUBLIC_ENTRYPOINTS = [
  'primitives',
  'components',
  'patterns',
  'page-templates',
  'app',
  'utils',
  'tokens',
];

/** Index section and page order; mirrors `storySort` in `.storybook/preview.tsx`. */
const SECTION_ORDER = [
  'Overview',
  'Tokens',
  'Primitives',
  'Components',
  'Patterns',
  'Page Templates',
  'Recipes',
];
const PAGE_ORDER = ['Introduction', 'Ghost Apps'];

const GITHUB_SHADE_PREFIX =
  /^https:\/\/github\.com\/TryGhost\/Ghost\/(?:blob|tree)\/[^/]+\/apps\/shade\//;

/** The served docs have no README beside them, so links to it go to GitHub. */
const README_URL = 'https://github.com/TryGhost/Ghost/blob/main/apps/shade/README.md';

export class DocsBuildError extends Error {
  name = 'DocsBuildError';
}

export interface DocWarning {
  file: string;
  line: number;
  message: string;
  /** `storybook-only` links target a live Storybook page with no generated doc; the rest point at nothing. */
  kind: 'storybook-only' | 'unresolved';
}

export interface ConvertedDoc {
  source: string;
  output: string;
  title: string;
  description: string;
  storybookTitle?: string;
  markdown: string;
}

export interface BuildResult {
  docs: ConvertedDoc[];
  warnings: DocWarning[];
}

// ---------------------------------------------------------------------------
// Paths and Storybook ids

const toPosix = (path: string): string => path.split(sep).join('/');

/** `src/docs/tokens.mdx` → `tokens.md`; `src/components/x/y.mdx` → `components/x/y.md`. */
export function outputPathFor(source: string): string {
  return source
    .replace(/^src\//, '')
    .replace(/^docs\//, '')
    .replace(/\.mdx$/, '.md');
}

/** Storybook's id sanitiser (storybook/internal/csf `sanitize`). */
export function sanitize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

/** Storybook's default story name for an export, e.g. `MobileMenu` → `Mobile Menu`. */
function storyNameFromExport(exportName: string): string {
  return exportName
    .replace(/([a-z\d])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2');
}

function listFiles(dir: string, predicate: (file: string) => boolean): string[] {
  if (!existsSync(dir)) {
    return [];
  }
  return readdirSync(dir, { recursive: true, encoding: 'utf8' })
    .map(toPosix)
    .filter((file) => !file.split('/').includes('node_modules') && predicate(file))
    .sort();
}

// ---------------------------------------------------------------------------
// Stories files

type ImportBinding = {
  specifier: string;
  /** `default`, `*` for a namespace import, or the imported name. */
  imported: string;
  typeOnly: boolean;
  declaration: ts.ImportDeclaration;
};

interface StoriesModule {
  path: string;
  title: string;
  sourceFile: ts.SourceFile;
  imports: Map<string, ImportBinding>;
  locals: Map<string, ts.Statement>;
  exports: string[];
}

function parseSource(path: string, text: string): ts.SourceFile {
  return ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

function unwrapExpression(node: ts.Expression): ts.Expression {
  let current = node;
  while (
    ts.isSatisfiesExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isParenthesizedExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression;
  }
  return current;
}

function property(
  object: ts.ObjectLiteralExpression,
  name: string,
): ts.ObjectLiteralElementLike | undefined {
  return object.properties.find(
    (prop) =>
      prop.name &&
      (ts.isIdentifier(prop.name) || ts.isStringLiteral(prop.name)) &&
      prop.name.text === name,
  );
}

function objectProperty(
  object: ts.ObjectLiteralExpression | undefined,
  name: string,
): ts.ObjectLiteralExpression | undefined {
  const prop = object && property(object, name);
  if (prop && ts.isPropertyAssignment(prop)) {
    const value = unwrapExpression(prop.initializer);
    return ts.isObjectLiteralExpression(value) ? value : undefined;
  }
  return undefined;
}

function stringProperty(object: ts.ObjectLiteralExpression, name: string): string | undefined {
  const prop = property(object, name);
  if (prop && ts.isPropertyAssignment(prop)) {
    const value = unwrapExpression(prop.initializer);
    if (ts.isStringLiteral(value) || ts.isNoSubstitutionTemplateLiteral(value)) {
      return value.text;
    }
  }
  return undefined;
}

function declaredNames(statement: ts.Statement): string[] {
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.flatMap((declaration) =>
      ts.isIdentifier(declaration.name) ? [declaration.name.text] : [],
    );
  }
  if (
    (ts.isFunctionDeclaration(statement) ||
      ts.isClassDeclaration(statement) ||
      ts.isInterfaceDeclaration(statement) ||
      ts.isTypeAliasDeclaration(statement) ||
      ts.isEnumDeclaration(statement)) &&
    statement.name
  ) {
    return [statement.name.text];
  }
  return [];
}

function isExported(statement: ts.Statement): boolean {
  return (
    ts.canHaveModifiers(statement) &&
    (ts.getModifiers(statement) ?? []).some(
      (modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword,
    )
  );
}

const storiesCache = new Map<string, StoriesModule>();

function loadStories(path: string): StoriesModule {
  const cached = storiesCache.get(path);
  if (cached) {
    return cached;
  }
  const sourceFile = parseSource(path, readFileSync(path, 'utf8'));
  const imports = new Map<string, ImportBinding>();
  const locals = new Map<string, ts.Statement>();
  const exports: string[] = [];
  let defaultExport: ts.Expression | undefined;

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      const specifier = statement.moduleSpecifier.text;
      const clause = statement.importClause;
      const typeOnly = Boolean(clause?.isTypeOnly);
      if (clause?.name) {
        imports.set(clause.name.text, {
          specifier,
          imported: 'default',
          typeOnly,
          declaration: statement,
        });
      }
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings)) {
        imports.set(bindings.name.text, {
          specifier,
          imported: '*',
          typeOnly,
          declaration: statement,
        });
      } else if (bindings) {
        for (const element of bindings.elements) {
          imports.set(element.name.text, {
            specifier,
            imported: (element.propertyName ?? element.name).text,
            typeOnly: typeOnly || element.isTypeOnly,
            declaration: statement,
          });
        }
      }
      continue;
    }
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      defaultExport = statement.expression;
      continue;
    }
    for (const name of declaredNames(statement)) {
      locals.set(name, statement);
      if (isExported(statement)) {
        exports.push(name);
      }
    }
  }

  let meta = defaultExport && unwrapExpression(defaultExport);
  if (meta && ts.isIdentifier(meta)) {
    const statement = locals.get(meta.text);
    const declaration =
      statement && ts.isVariableStatement(statement)
        ? statement.declarationList.declarations.find(
            (d) => ts.isIdentifier(d.name) && d.name.text === (meta as ts.Identifier).text,
          )
        : undefined;
    meta = declaration?.initializer && unwrapExpression(declaration.initializer);
  }
  const title =
    meta && ts.isObjectLiteralExpression(meta) ? stringProperty(meta, 'title') : undefined;
  if (!title) {
    throw new DocsBuildError(
      `${path}: the default export has no literal \`title\`, so its stories can't be named.`,
    );
  }

  const loaded: StoriesModule = { path, title, sourceFile, imports, locals, exports };
  storiesCache.set(path, loaded);
  return loaded;
}

/** Identifiers a node reads, excluding property names, JSX attribute names and the like. */
function referencedNames(node: ts.Node): Set<string> {
  const names = new Set<string>();
  const visit = (child: ts.Node): void => {
    if (ts.isIdentifier(child)) {
      const parent = child.parent;
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === child) ||
        ((ts.isPropertyAssignment(parent) ||
          ts.isMethodDeclaration(parent) ||
          ts.isPropertyDeclaration(parent) ||
          ts.isPropertySignature(parent)) &&
          parent.name === child) ||
        (ts.isJsxAttribute(parent) && parent.name === child) ||
        (ts.isQualifiedName(parent) && parent.right === child) ||
        (ts.isBindingElement(parent) && parent.propertyName === child);
      if (!isPropertyName) {
        names.add(child.text);
      }
    }
    ts.forEachChild(child, visit);
  };
  visit(node);
  return names;
}

/** Source text of a node, dedented by the indentation of the line it starts on. */
function nodeText(sourceFile: ts.SourceFile, node: ts.Node, withComments = false): string {
  const text = sourceFile.text;
  const start = node.getStart(sourceFile);
  const comments = withComments ? ts.getLeadingCommentRanges(text, node.getFullStart()) : undefined;
  const from = comments?.[0]?.pos ?? start;
  const lineStart = text.lastIndexOf('\n', from - 1) + 1;
  const indent = /^[ \t]*/.exec(text.slice(lineStart, from))?.[0] ?? '';
  return text
    .slice(from, node.getEnd())
    .split('\n')
    .map((line, index) => (index > 0 && line.startsWith(indent) ? line.slice(indent.length) : line))
    .join('\n');
}

// ---------------------------------------------------------------------------
// Mapping internal imports to the package's public subpaths

const parsedModules = new Map<string, ts.SourceFile>();

function parseModule(path: string): ts.SourceFile {
  let sourceFile = parsedModules.get(path);
  if (!sourceFile) {
    sourceFile = parseSource(path, readFileSync(path, 'utf8'));
    parsedModules.set(path, sourceFile);
  }
  return sourceFile;
}

function resolveModule(
  packageRoot: string,
  fromFile: string,
  specifier: string,
): string | undefined {
  let base: string;
  if (specifier.startsWith('@/')) {
    base = join(packageRoot, 'src', specifier.slice(2));
  } else if (specifier.startsWith('.')) {
    base = resolve(dirname(fromFile), specifier);
  } else {
    return undefined;
  }
  return ['.ts', '.tsx', '/index.ts', '/index.tsx', '']
    .map((suffix) => `${base}${suffix}`)
    .find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
}

interface ExportOrigin {
  file: string;
  name: string;
}

/** Follows re-exports from `file` to the module that declares `name`. */
function exportOrigin(
  packageRoot: string,
  file: string,
  name: string,
  seen = new Set<string>(),
): ExportOrigin | undefined {
  const key = `${file}#${name}`;
  if (seen.has(key) || !/\.tsx?$/.test(file)) {
    return undefined;
  }
  seen.add(key);
  const sourceFile = parseModule(file);

  for (const statement of sourceFile.statements) {
    if (ts.isExportDeclaration(statement)) {
      const target =
        statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)
          ? resolveModule(packageRoot, file, statement.moduleSpecifier.text)
          : undefined;
      const clause = statement.exportClause;
      if (!clause) {
        const origin =
          target && name !== 'default' ? exportOrigin(packageRoot, target, name, seen) : undefined;
        if (origin) {
          return origin;
        }
      } else if (ts.isNamespaceExport(clause)) {
        if (clause.name.text === name && target) {
          return { file: target, name: '*' };
        }
      } else {
        for (const element of clause.elements) {
          if (element.name.text !== name) {
            continue;
          }
          const local = (element.propertyName ?? element.name).text;
          if (!target) {
            return { file, name: local };
          }
          return exportOrigin(packageRoot, target, local, seen) ?? { file: target, name: local };
        }
      }
    } else if (ts.isExportAssignment(statement)) {
      if (name === 'default') {
        return { file, name };
      }
    } else if (isExported(statement)) {
      const isDefault = (ts.getModifiers(statement as ts.HasModifiers) ?? []).some(
        (modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword,
      );
      if (isDefault ? name === 'default' : declaredNames(statement).includes(name)) {
        return { file, name };
      }
    }
  }
  return undefined;
}

/** The public subpath and export name that expose an internal binding, if any. */
function publicImport(
  packageRoot: string,
  file: string,
  imported: string,
  localName: string,
): { specifier: string; name: string } | undefined {
  const origin = exportOrigin(packageRoot, file, imported) ?? { file, name: imported };
  const candidates = [...new Set([imported, localName])].filter((name) => name !== 'default');
  for (const entry of PUBLIC_ENTRYPOINTS) {
    const entryFile = join(packageRoot, 'src', `${entry}.ts`);
    if (!existsSync(entryFile)) {
      continue;
    }
    for (const candidate of candidates) {
      const found = exportOrigin(packageRoot, entryFile, candidate);
      if (found && found.file === origin.file && found.name === origin.name) {
        return { specifier: `@tryghost/shade/${entry}`, name: candidate };
      }
    }
  }
  return undefined;
}

// ---------------------------------------------------------------------------
// Story snippets

interface SnippetState {
  /** Local helper name → label of the story whose snippet already showed it. */
  shownHelpers: Map<string, string>;
}

function storyObject(
  module: StoriesModule,
  exportName: string,
): { initializer: ts.Expression; statement: ts.Statement } | undefined {
  const statement = module.locals.get(exportName);
  if (!statement || !ts.isVariableStatement(statement) || !module.exports.includes(exportName)) {
    return undefined;
  }
  const declaration = statement.declarationList.declarations.find(
    (d) => ts.isIdentifier(d.name) && d.name.text === exportName,
  );
  return declaration?.initializer
    ? { initializer: unwrapExpression(declaration.initializer), statement }
    : undefined;
}

function formatImports(
  packageRoot: string,
  module: StoriesModule,
  names: Iterable<string>,
): string[] {
  interface Group {
    defaultName?: string;
    namespace?: string;
    named: string[];
    note?: string;
  }
  const groups = new Map<string, Group>();
  const used = [...names]
    .filter((name) => module.imports.has(name))
    .sort(
      (a, b) =>
        module.imports.get(a)!.declaration.pos - module.imports.get(b)!.declaration.pos ||
        a.localeCompare(b),
    );

  for (const localName of used) {
    const binding = module.imports.get(localName)!;
    let specifier = binding.specifier;
    let imported = binding.imported;
    let note: string | undefined;
    const internal = resolveModule(packageRoot, module.path, binding.specifier);
    if (internal && imported !== '*') {
      const found = publicImport(packageRoot, internal, imported, localName);
      if (found) {
        specifier = found.specifier;
        imported = found.name;
      } else {
        note = 'internal to Shade; not exported by @tryghost/shade';
      }
    } else if (binding.specifier.startsWith('@/') || binding.specifier.startsWith('.')) {
      note = 'internal to Shade; not exported by @tryghost/shade';
    }
    const group = groups.get(specifier) ?? { named: [] };
    groups.set(specifier, group);
    group.note ??= note;
    const prefix = binding.typeOnly ? 'type ' : '';
    if (imported === '*') {
      group.namespace = localName;
    } else if (imported === 'default') {
      group.defaultName = localName;
    } else {
      group.named.push(
        `${prefix}${imported === localName ? localName : `${imported} as ${localName}`}`,
      );
    }
  }

  const lines: string[] = [];
  for (const [specifier, group] of groups) {
    const suffix = group.note ? ` // ${group.note}` : '';
    if (group.namespace) {
      lines.push(`import * as ${group.namespace} from '${specifier}';${suffix}`);
    }
    const parts = [
      group.defaultName,
      group.named.length > 0 ? `{ ${group.named.join(', ')} }` : undefined,
    ].filter(Boolean);
    if (parts.length > 0) {
      lines.push(`import ${parts.join(', ')} from '${specifier}';${suffix}`);
    }
  }
  return lines;
}

/**
 * The code for one story: `parameters.docs.source.code` when the story sets it,
 * otherwise its render function (or CSF2 function) plus the imports and local
 * helpers it uses. Helpers an earlier snippet in the same doc showed are
 * referenced rather than repeated.
 */
export function storySnippet(
  packageRoot: string,
  storiesPath: string,
  exportName: string,
  state: SnippetState = { shownHelpers: new Map() },
): { code: string; label: string } {
  const module = loadStories(storiesPath);
  const where = `${toPosix(relative(packageRoot, storiesPath))} → ${exportName}`;
  const story = storyObject(module, exportName);
  if (!story) {
    throw new DocsBuildError(`${where}: no exported story named "${exportName}".`);
  }

  const { initializer } = story;
  let label = `${module.title} → ${exportName}`;
  let codeNode: ts.Node | undefined;
  let code: string | undefined;

  if (ts.isObjectLiteralExpression(initializer)) {
    const displayName = stringProperty(initializer, 'name');
    if (displayName && displayName !== storyNameFromExport(exportName)) {
      label += ` ("${displayName}")`;
    }
    const docs = objectProperty(objectProperty(initializer, 'parameters'), 'docs');
    const source = objectProperty(docs, 'source');
    if (source && property(source, 'code')) {
      const literal = stringProperty(source, 'code');
      if (literal === undefined) {
        throw new DocsBuildError(
          `${where}: parameters.docs.source.code must be a string literal to be extracted.`,
        );
      }
      return { code: literal.trim(), label };
    }
    const render = property(initializer, 'render');
    if (render && ts.isPropertyAssignment(render)) {
      const fn = unwrapExpression(render.initializer);
      if (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn)) {
        codeNode = fn;
        code = `export const ${exportName} = ${nodeText(module.sourceFile, fn)};`;
      }
    } else if (render && ts.isMethodDeclaration(render) && render.body) {
      codeNode = render;
      code = nodeText(module.sourceFile, render).replace(
        /^(async\s+)?render\s*/,
        (_, isAsync: string | undefined) => `export ${isAsync ?? ''}function ${exportName}`,
      );
    }
  } else if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
    codeNode = initializer;
    code = `export const ${exportName} = ${nodeText(module.sourceFile, initializer)};`;
  }

  if (!codeNode || !code) {
    throw new DocsBuildError(
      `${where}: the story has neither a render function nor parameters.docs.source.code, so its code can't be extracted. Add one of them to the story.`,
    );
  }

  // Local helpers the story needs, transitively.
  const needed = new Set<string>();
  const queue = [...referencedNames(codeNode)];
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (needed.has(name) || name === exportName || !module.locals.has(name)) {
      continue;
    }
    needed.add(name);
    if (!state.shownHelpers.has(name)) {
      queue.push(...referencedNames(module.locals.get(name)!));
    }
  }
  const statements = [...new Set([...needed].map((name) => module.locals.get(name)!))].sort(
    (a, b) => a.pos - b.pos,
  );
  const fresh = statements.filter((statement) =>
    declaredNames(statement).some((name) => !state.shownHelpers.has(name)),
  );
  const freshNames = new Set(fresh.flatMap(declaredNames));
  const shownBefore = [...needed].filter((name) => !freshNames.has(name));

  const emittedRefs = new Set(referencedNames(codeNode));
  for (const statement of fresh) {
    for (const name of referencedNames(statement)) {
      emittedRefs.add(name);
    }
  }
  const directShown = shownBefore.filter((name) => emittedRefs.has(name));

  const sections: string[] = [];
  const imports = formatImports(packageRoot, module, emittedRefs);
  if (imports.length > 0) {
    sections.push(imports.join('\n'));
  }
  for (const statement of fresh) {
    sections.push(nodeText(module.sourceFile, statement, true));
  }
  const byStory = new Map<string, string[]>();
  for (const name of directShown) {
    const shownIn = state.shownHelpers.get(name)!;
    byStory.set(shownIn, [...(byStory.get(shownIn) ?? []), name]);
  }
  const notes = [...byStory].map(
    ([shownIn, names]) => `// ${names.join(', ')}: see the ${shownIn} story above.`,
  );
  sections.push([...notes, code].join('\n'));

  for (const name of freshNames) {
    state.shownHelpers.set(name, exportName);
  }
  return { code: sections.join('\n\n'), label };
}

function fence(code: string, language: string): string {
  const longest = Math.max(2, ...[...code.matchAll(/`{3,}/g)].map((match) => match[0].length));
  const marker = '`'.repeat(longest + 1);
  return `${marker}${language}\n${code}\n${marker}`;
}

// ---------------------------------------------------------------------------
// MDX → Markdown

interface DocMeta {
  title?: string;
  of?: string;
  name?: string;
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  const pattern =
    /([A-Za-z][\w-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|([^}]*?))\s*\})/g;
  for (const match of tag.matchAll(pattern)) {
    const [, key, ...values] = match;
    attributes[key!] = values.find((value) => value !== undefined) ?? '';
  }
  return attributes;
}

/** Ranges `[start, end)` of inline code spans in a line. */
function codeSpans(line: string): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let index = 0;
  while (index < line.length) {
    if (line[index] === '\\') {
      index += 2;
      continue;
    }
    if (line[index] !== '`') {
      index += 1;
      continue;
    }
    const run = /^`+/.exec(line.slice(index))![0];
    const close = new RegExp(`(?<!\`)${run}(?!\`)`, 'g');
    close.lastIndex = index + run.length;
    const match = close.exec(line);
    if (!match) {
      index += run.length;
      continue;
    }
    spans.push([index, match.index + run.length]);
    index = match.index + run.length;
  }
  return spans;
}

const inSpan = (spans: Array<[number, number]>, position: number): boolean =>
  spans.some(([start, end]) => position >= start && position < end);

interface DocIndex {
  packageRoot: string;
  /** Storybook doc id → generated output path. */
  docsById: Map<string, string>;
  /** Source path (relative to the package) → generated output path. */
  outputsBySource: Map<string, string>;
  /** Ids of Storybook pages that exist but have no generated doc (autodocs, stories, galleries). */
  storybookIds: () => Set<string>;
}

function storyIdsIn(packageRoot: string): Set<string> {
  const ids = new Set<string>();
  const srcDir = join(packageRoot, 'src');
  for (const file of listFiles(srcDir, (f) => /\.stories\.[jt]sx?$/.test(f))) {
    let module: StoriesModule;
    try {
      module = loadStories(join(srcDir, file));
    } catch {
      continue;
    }
    const id = sanitize(module.title);
    ids.add(`${id}--docs`);
    for (const exportName of module.exports) {
      ids.add(`${id}--${sanitize(storyNameFromExport(exportName))}`);
    }
  }
  return ids;
}

function relativeLink(fromOutput: string, toOutput: string, anchor = ''): string {
  const link = posix.relative(posix.dirname(fromOutput), toOutput);
  return `${link.startsWith('.') ? link : `./${link}`}${anchor}`;
}

/**
 * Rewrites one link target. Returns the new URL, or `undefined` to keep the
 * link text as plain text (a warning explains why).
 */
function rewriteLink(
  url: string,
  context: {
    source: string;
    output: string;
    line: number;
    index: DocIndex;
    warnings: DocWarning[];
  },
): string | undefined {
  const { source, output, line, index, warnings } = context;
  const warn = (message: string, kind: DocWarning['kind'] = 'unresolved'): undefined => {
    warnings.push({ file: source, line, message, kind });
    return undefined;
  };

  if (/^(?:mailto:|#)/.test(url)) {
    return url;
  }

  const github = GITHUB_SHADE_PREFIX.exec(url);
  if (github) {
    const [path = '', anchor = ''] = url.slice(github[0].length).split(/(?=#)/);
    const generated = index.outputsBySource.get(path);
    if (generated) {
      return relativeLink(output, generated, anchor);
    }
    return url;
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(url)) {
    return url;
  }

  const storybook = /^(?:\.?\/)?\?path=\/(docs|story)\/([^#&]+)(?:&[^#]*)?(#.*)?$/.exec(url);
  if (storybook) {
    const [, , id = '', anchor = ''] = storybook;
    const generated = index.docsById.get(id);
    if (generated) {
      return relativeLink(output, generated, anchor);
    }
    if (index.storybookIds().has(id)) {
      return warn(
        `"${url}" is a Storybook-only page; kept the link text as plain text.`,
        'storybook-only',
      );
    }
    return warn(`"${url}" matches no Storybook page or doc; kept the link text as plain text.`);
  }

  const [path = '', anchor = ''] = url.split(/(?=#)/);
  const target = toPosix(
    relative(index.packageRoot, resolve(index.packageRoot, dirname(source), path)),
  );
  const generated = index.outputsBySource.get(target);
  if (generated) {
    return relativeLink(output, generated, anchor);
  }
  if (path.endsWith('.mdx')) {
    throw new DocsBuildError(`${source}:${line}: link to "${url}" points at a missing .mdx file.`);
  }
  if (target === 'README.md') {
    return `${README_URL}${anchor}`;
  }
  return warn(`"${url}" points outside the generated docs; kept the link text as plain text.`);
}

/** Converts one `.mdx` source (path relative to the package root) to Markdown. */
export function convertMdx(
  source: string,
  content: string,
  index: DocIndex,
  warnings: DocWarning[] = [],
): ConvertedDoc {
  const output = outputPathFor(source);
  const sourceDir = dirname(join(index.packageRoot, source));
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const out: string[] = [];
  const storyImports = new Map<string, { specifier: string; imported: string }>();
  const snippets: SnippetState = { shownHelpers: new Map() };
  let meta: DocMeta | undefined;
  let openFence: { char: string; length: number } | undefined;

  const fail = (line: number, message: string): never => {
    throw new DocsBuildError(`${source}:${line}: ${message}`);
  };
  const push = (line: string): void => {
    if (line.trim() === '' && (out.length === 0 || out.at(-1)!.trim() === '')) {
      return;
    }
    out.push(line);
  };

  /** Collects a JSX tag that may span several lines; returns its text and last line index. */
  const collectTag = (start: number): { text: string; end: number } => {
    let text = lines[start]!;
    let end = start;
    while (!/>\s*$/.test(text) && end + 1 < lines.length) {
      end += 1;
      text += `\n${lines[end]}`;
    }
    return { text, end };
  };

  const storiesFileFor = (localName: string, line: number): string => {
    const binding = storyImports.get(localName);
    if (!binding) {
      return fail(line, `"${localName}" is not imported from a stories file.`);
    }
    const base = resolve(sourceDir, binding.specifier);
    const file = ['', '.tsx', '.ts', '.jsx', '.js']
      .map((suffix) => `${base}${suffix}`)
      .find((candidate) => /\.[jt]sx?$/.test(candidate) && existsSync(candidate));
    return file ?? fail(line, `can't find the stories file "${binding.specifier}".`);
  };

  const inline = (text: string, line: number): string => {
    const withoutComments = text.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    const spans = codeSpans(withoutComments);
    for (let i = 0; i < withoutComments.length; i += 1) {
      const char = withoutComments[i];
      if (char === '\\') {
        i += 1;
        continue;
      }
      if (inSpan(spans, i)) {
        continue;
      }
      if (char === '{' || char === '}') {
        fail(
          line,
          'MDX expression outside a code fence has no Markdown equivalent. Escape the brace, put it in `code`, or add a conversion rule to scripts/build-docs.ts.',
        );
      }
      if (char === '<') {
        const rest = withoutComments.slice(i);
        if (/^<(?:https?:|mailto:)[^>\s]*>/.test(rest) || /^<[^>\s@]+@[^>\s]+>/.test(rest)) {
          continue;
        }
        const tag = /^<\/?([A-Za-z][\w.-]*)|^<!--/.exec(rest);
        if (tag) {
          fail(
            line,
            `unsupported JSX/HTML "${tag[0]}…" outside a code fence. Add a conversion rule to scripts/build-docs.ts or move it into a fenced code block.`,
          );
        }
      }
    }
    return withoutComments.replace(
      /(!?)\[((?:[^[\]]|\[[^\]]*\])*)\]\(([^()\s]+)(\s+"[^"]*")?\)/g,
      (
        match,
        bang: string,
        label: string,
        url: string,
        title: string | undefined,
        offset: number,
      ) => {
        if (inSpan(spans, offset)) {
          return match;
        }
        const rewritten = rewriteLink(url, { source, output, line, index, warnings });
        if (rewritten === undefined) {
          return bang ? match : label;
        }
        return `${bang}[${label}](${rewritten}${title ?? ''})`;
      },
    );
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!;
    const lineNumber = i + 1;

    if (openFence) {
      out.push(line);
      const close = /^\s*(`{3,}|~{3,})\s*$/.exec(line);
      if (close && close[1]![0] === openFence.char && close[1]!.length >= openFence.length) {
        openFence = undefined;
      }
      continue;
    }

    const opening = /^\s*(`{3,}|~{3,})/.exec(line);
    if (opening) {
      openFence = { char: opening[1]![0]!, length: opening[1]!.length };
      out.push(line);
      continue;
    }

    if (/^import\s/.test(line)) {
      let statement = line;
      while (!/(?:from\s*|^import\s*)['"][^'"]+['"]\s*;?\s*$/.test(statement)) {
        if (i + 1 >= lines.length) {
          fail(lineNumber, 'unterminated import statement.');
        }
        i += 1;
        statement += `\n${lines[i]}`;
      }
      const from = /['"]([^'"]+)['"]\s*;?\s*$/.exec(statement)![1]!;
      if (/\.stories(?:\.[jt]sx?)?$/.test(from)) {
        const namespace = /import\s+\*\s+as\s+([\w$]+)/.exec(statement);
        if (namespace) {
          storyImports.set(namespace[1]!, { specifier: from, imported: '*' });
        }
        const named = /\{([^}]*)\}/.exec(statement);
        for (const part of named?.[1]?.split(',') ?? []) {
          const [imported, local] = part.trim().split(/\s+as\s+/);
          if (imported) {
            storyImports.set(local ?? imported, { specifier: from, imported });
          }
        }
      }
      continue;
    }

    if (/^export\s/.test(line)) {
      fail(lineNumber, 'MDX `export` statements are not supported outside a code fence.');
    }

    const block = /^\s*<(?!(?:https?|mailto):)([A-Za-z][\w.]*)/.exec(line);
    if (block) {
      const tagName = block[1]!;
      if (['Meta', 'Canvas', 'Story', 'Source'].includes(tagName)) {
        const { text, end } = collectTag(i);
        i = end;
        if (!/\/>\s*$/.test(text)) {
          fail(lineNumber, `<${tagName}> with children isn't supported; use a self-closing tag.`);
        }
        const attributes = parseAttributes(text);
        if (tagName === 'Meta') {
          meta = { title: attributes.title, of: attributes.of, name: attributes.name };
          continue;
        }
        const of = /^([\w$]+)(?:\.([\w$]+))?$/.exec(attributes.of ?? '');
        if (!of) {
          fail(lineNumber, `<${tagName}> needs of={Stories.Name} to be converted to code.`);
        }
        const [, local = '', member] = of!;
        const binding = storyImports.get(local);
        const exportName = member ?? binding?.imported ?? local;
        const storiesPath = storiesFileFor(local, lineNumber);
        let snippet: { code: string; label: string };
        try {
          snippet = storySnippet(index.packageRoot, storiesPath, exportName, snippets);
        } catch (error) {
          throw new DocsBuildError(`${source}:${lineNumber}: ${(error as Error).message}`);
        }
        push('');
        push(`_Story: ${snippet.label}_`);
        push('');
        out.push(...fence(snippet.code, 'tsx').split('\n'));
        continue;
      }
      if (tagName === 'div' || tagName === 'p') {
        const wrapper = new RegExp(
          `^\\s*<${tagName}(?:\\s[^>]*)?>(.*?)(?:</${tagName}>)?\\s*$`,
        ).exec(line);
        if (!wrapper) {
          fail(lineNumber, `couldn't unwrap <${tagName}>; keep its opening tag on one line.`);
        }
        const inner = wrapper![1]!;
        if (inner.trim() !== '') {
          push(inline(inner, lineNumber));
        }
        continue;
      }
      fail(
        lineNumber,
        `unsupported JSX "<${tagName}>" outside a code fence. Add a conversion rule to scripts/build-docs.ts or move it into a fenced code block.`,
      );
    }

    if (/^\s*<\/(?:div|p)>\s*$/.test(line)) {
      continue;
    }

    push(inline(line.replace(/<\/p>\s*$/, ''), lineNumber));
  }

  if (openFence) {
    fail(lines.length, 'unclosed code fence.');
  }
  while (out.length > 0 && out.at(-1)!.trim() === '') {
    out.pop();
  }

  let storybookTitle = meta?.title;
  if (!storybookTitle && meta?.of) {
    storybookTitle = loadStories(storiesFileFor(meta.of, 1)).title;
  }
  const { title, description } = summarise(out, storybookTitle, source);

  const markdown = `<!-- Generated from ${source} by ${SCRIPT}. Do not edit. -->\n\n${out.join('\n')}\n`;
  return { source, output, title, description, storybookTitle, markdown };
}

/** The doc's first heading and the paragraph after it, flattened to one line. */
function summarise(
  lines: string[],
  storybookTitle: string | undefined,
  source: string,
): { title: string; description: string } {
  let title: string | undefined;
  let description = '';
  let inFence = false;
  const paragraph: string[] = [];
  for (const line of lines) {
    if (/^\s*(`{3,}|~{3,})/.test(line)) {
      inFence = !inFence;
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }
    if (inFence) {
      continue;
    }
    if (!title) {
      title = /^#\s+(.+)$/.exec(line)?.[1]?.trim();
      continue;
    }
    if (line.trim() === '' || /^(?:#|[-*+]\s|\d+\.\s|\||>|_Story:)/.test(line.trim())) {
      if (paragraph.length > 0) {
        break;
      }
      continue;
    }
    paragraph.push(line.trim());
  }
  description = paragraph
    .join(' ')
    .replace(/!?\[((?:[^[\]]|\[[^\]]*\])*)\]\([^)]*\)/g, '$1')
    .trim();
  return {
    title: title ?? storybookTitle?.split('/').at(-1)?.trim() ?? posix.basename(source, '.mdx'),
    description,
  };
}

// ---------------------------------------------------------------------------
// Whole build

function docIdFor(packageRoot: string, source: string, content: string): string | undefined {
  const tag = /^<Meta\b[\s\S]*?\/>/m.exec(content)?.[0];
  if (!tag) {
    return undefined;
  }
  const attributes = parseAttributes(tag);
  let title = attributes.title;
  if (!title && attributes.of) {
    const namespace = new RegExp(
      `import\\s+\\*\\s+as\\s+${attributes.of}\\s+from\\s+['"]([^'"]+)['"]`,
    ).exec(content);
    if (!namespace) {
      throw new DocsBuildError(`${source}: <Meta of={${attributes.of}}> needs a namespace import.`);
    }
    const base = resolve(packageRoot, dirname(source), namespace[1]!);
    const file = ['', '.tsx', '.ts', '.jsx', '.js']
      .map((suffix) => `${base}${suffix}`)
      .find((candidate) => /\.[jt]sx?$/.test(candidate) && existsSync(candidate));
    if (!file) {
      throw new DocsBuildError(`${source}: can't find the stories file "${namespace[1]}".`);
    }
    title = loadStories(file).title;
  }
  return title ? `${sanitize(title)}--${sanitize(attributes.name ?? 'Docs')}` : undefined;
}

interface IndexSection {
  name: string;
  docs: ConvertedDoc[];
}

/** Docs grouped into Storybook sections, in sidebar order. Shared by `index.md` and `llms.txt`. */
function indexSections(docs: ConvertedDoc[]): IndexSection[] {
  const sectionOf = (doc: ConvertedDoc): string =>
    doc.storybookTitle?.split('/')[0]?.trim() || 'Other';
  const pageOf = (doc: ConvertedDoc): string => doc.storybookTitle?.split('/').at(-1)?.trim() ?? '';
  const rank = (list: string[], value: string): number => {
    const position = list.indexOf(value);
    return position === -1 ? list.length : position;
  };
  const sections = [...new Set(docs.map(sectionOf))].sort(
    (a, b) => rank(SECTION_ORDER, a) - rank(SECTION_ORDER, b) || a.localeCompare(b),
  );
  return sections.map((name) => ({
    name,
    docs: docs
      .filter((doc) => sectionOf(doc) === name)
      .sort((a, b) => {
        const guideA = /guide$|^page types$/i.test(pageOf(a)) ? 0 : 1;
        const guideB = /guide$|^page types$/i.test(pageOf(b)) ? 0 : 1;
        return (
          rank(PAGE_ORDER, pageOf(a)) - rank(PAGE_ORDER, pageOf(b)) ||
          guideA - guideB ||
          a.title.localeCompare(b.title)
        );
      }),
  }));
}

function sectionLines(docs: ConvertedDoc[], href: (doc: ConvertedDoc) => string): string[] {
  const lines: string[] = [];
  for (const section of indexSections(docs)) {
    lines.push('', `## ${section.name}`, '');
    for (const doc of section.docs) {
      lines.push(`- [${doc.title}](${href(doc)})${doc.description ? `: ${doc.description}` : ''}`);
    }
  }
  return lines;
}

export function indexMarkdown(docs: ConvertedDoc[]): string {
  const lines = [
    `<!-- Generated from src/**/*.mdx by ${SCRIPT}. Do not edit. -->`,
    '',
    '# Shade docs',
    '',
    "Shade's design rules, generated from its Storybook docs. Story examples import from the package's public subpaths.",
    ...sectionLines(docs, (doc) => doc.output),
  ];
  return `${lines.join('\n')}\n`;
}

/**
 * The llmstxt.org index Storybook serves at `/llms.txt`. Links are root-relative
 * (`/docs/tokens.md`), so the same file works on localhost and on the hosted
 * Storybook without knowing its address.
 */
export function llmsTxt(docs: ConvertedDoc[]): string {
  const lines = [
    '# Shade',
    '',
    "> Shade is Ghost's design system for React apps (`@tryghost/shade`). These are its design rules as plain Markdown, generated from the Storybook docs: tokens, layers, components, patterns and page templates, with story examples that import from the package's public subpaths.",
    '',
    'Every link below is a Markdown file on this server; the [docs index](/docs/index.md) lists the same docs. Links inside a doc are relative to that doc.',
    ...sectionLines(docs, (doc) => `/docs/${doc.output}`),
  ];
  return `${lines.join('\n')}\n`;
}

/** Converts every `src/**\/*.mdx` in `packageRoot`; writes nothing. */
export function buildDocs(packageRoot: string): BuildResult {
  // A long-lived process (Storybook) rebuilds after edits, so parse files afresh.
  storiesCache.clear();
  parsedModules.clear();
  const sources = listFiles(join(packageRoot, 'src'), (file) => file.endsWith('.mdx')).map(
    (file) => `src/${file}`,
  );
  const contents = new Map(
    sources.map((source) => [source, readFileSync(join(packageRoot, source), 'utf8')]),
  );

  const outputsBySource = new Map<string, string>();
  const claimed = new Map<string, string>([['index.md', '(the generated index)']]);
  const docsById = new Map<string, string>();
  for (const source of sources) {
    const output = outputPathFor(source);
    const other = claimed.get(output);
    if (other) {
      throw new DocsBuildError(`${source} and ${other} would both generate docs/${output}.`);
    }
    claimed.set(output, source);
    outputsBySource.set(source, output);
    const id = docIdFor(packageRoot, source, contents.get(source)!);
    if (id) {
      docsById.set(id, output);
    }
  }

  let storybookIds: Set<string> | undefined;
  const index: DocIndex = {
    packageRoot,
    docsById,
    outputsBySource,
    storybookIds: () => (storybookIds ??= storyIdsIn(packageRoot)),
  };
  const warnings: DocWarning[] = [];
  const docs = sources.map((source) => convertMdx(source, contents.get(source)!, index, warnings));
  return { docs, warnings };
}

/** Builds and writes `outDir`, replacing what was there. */
export async function writeDocs(packageRoot: string, outDir: string): Promise<BuildResult> {
  const result = buildDocs(packageRoot);
  await rm(outDir, { recursive: true, force: true });
  for (const doc of result.docs) {
    const path = join(outDir, doc.output);
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, doc.markdown);
  }
  await mkdir(outDir, { recursive: true });
  await writeFile(join(outDir, 'index.md'), indexMarkdown(result.docs));
  return result;
}

/**
 * Builds the docs Storybook serves: `<siteDir>/docs/**` and `<siteDir>/llms.txt`.
 * Nothing is written if the build fails.
 */
export async function writeStorybookDocs(
  packageRoot: string,
  siteDir: string,
): Promise<BuildResult> {
  const result = await writeDocs(packageRoot, join(siteDir, 'docs'));
  await writeFile(join(siteDir, 'llms.txt'), llmsTxt(result.docs));
  return result;
}
