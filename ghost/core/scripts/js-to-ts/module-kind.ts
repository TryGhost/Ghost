import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { builtinModules, createRequire } from 'node:module';
import path from 'node:path';

/**
 * How a module's `module.exports` is shaped, which decides how an
 * `import` of it compiles:
 *
 * - `cjs`: a plain CommonJS module. `import X from 'm'` compiles to
 *   `__importDefault(require('m')).default`, which is `require('m')`.
 * - `esm`: ESM-authored (TypeScript, or compiled output flagged with
 *   `__esModule`). `import * as X from 'm'` compiles to
 *   `__importStar(require('m'))`, which is `require('m')`, and
 *   `import X from 'm'` is `require('m').default`.
 * - `unknown`: couldn't resolve or classify it, so no conversion is safe.
 */
export type ModuleKind = 'cjs' | 'esm' | 'unknown';

const BUILTINS = new Set(builtinModules);
const RELATIVE_EXTENSIONS = ['', '.ts', '.js', '.json', '/index.ts', '/index.js'];
const ESM_SYNTAX = /^\s*(?:import\s[^(]|export\s)/m;
const EXPORT_ASSIGNMENT = /^\s*export\s*=/m;
// `Object.defineProperty(exports, '__esModule', ...)` or
// `exports.__esModule = true`, as TypeScript and Babel emit.
const ES_MODULE_FLAG = /\bexports\s*,\s*['"]__esModule['"]|\bexports\.__esModule\s*=/;

const cache = new Map<string, ModuleKind>();

function isFile(filePath: string): boolean {
  try {
    return statSync(filePath).isFile();
  } catch {
    return false;
  }
}

function resolveRelative(fromFile: string, specifier: string): string | null {
  const base = path.resolve(path.dirname(fromFile), specifier);
  for (const extension of RELATIVE_EXTENSIONS) {
    const candidate = base + extension;
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

function resolvePackage(fromFile: string, specifier: string): string | null {
  try {
    return createRequire(fromFile).resolve(specifier);
  } catch {
    return null;
  }
}

function classifySourceFile(filePath: string): ModuleKind {
  const extension = path.extname(filePath);
  if (extension === '.json') {
    return 'cjs';
  }
  if (!existsSync(filePath)) {
    return 'unknown';
  }
  const source = readFileSync(filePath, 'utf8');
  if (['.ts', '.mts', '.cts'].includes(extension)) {
    // `export = x` compiles to `module.exports = x`.
    if (EXPORT_ASSIGNMENT.test(source)) {
      return 'cjs';
    }
    return ESM_SYNTAX.test(source) ? 'esm' : 'unknown';
  }
  if (['.js', '.cjs'].includes(extension)) {
    return ES_MODULE_FLAG.test(source) || ESM_SYNTAX.test(source) ? 'esm' : 'cjs';
  }
  return 'unknown';
}

/**
 * Packages are often bundled or compiled, which makes reading their source
 * unreliable, so load them (in a separate process, in case loading has side
 * effects) and look at the flag itself.
 */
function classifyPackage(resolved: string): ModuleKind {
  const result = spawnSync(
    process.execPath,
    ['-e', 'process.stdout.write(String(Boolean(require(process.argv[1]).__esModule)))', resolved],
    { encoding: 'utf8' },
  );
  if (result.status !== 0) {
    return 'unknown';
  }
  return result.stdout === 'true' ? 'esm' : 'cjs';
}

/**
 * Classifies the module `specifier` resolves to when required from
 * `fromFile`. Relative specifiers are resolved against the current disk
 * state, so a sibling that was converted earlier in the same run is seen as
 * the `.ts` file it now is.
 */
export function getModuleKind(fromFile: string, specifier: string): ModuleKind {
  if (specifier.startsWith('node:') || BUILTINS.has(specifier)) {
    return 'cjs';
  }

  const isRelative = specifier.startsWith('.') || specifier.startsWith('/');
  const resolved = isRelative
    ? resolveRelative(fromFile, specifier)
    : resolvePackage(fromFile, specifier);
  if (!resolved) {
    return 'unknown';
  }

  // Relative files may be converted during a run, so only packages are
  // cached.
  if (isRelative) {
    return classifySourceFile(resolved);
  }
  let kind = cache.get(resolved);
  if (!kind) {
    kind = resolved.includes(`${path.sep}node_modules${path.sep}`)
      ? classifyPackage(resolved)
      : classifySourceFile(resolved);
    cache.set(resolved, kind);
  }
  return kind;
}
