import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import errors from '@tryghost/errors';
import type { AdapterConstructor } from './types';

/**
 * Whether `filePath` resolves to a location inside `directory`.
 *
 * Both sides are resolved through `fs.realpathSync` before comparing, because
 * Node's module resolution returns realpaths — so a symlinked install (or macOS'
 * `/var` -> `/private/var`) would otherwise look like an escape.
 */
function isContainedBy(filePath: string, directory: string): boolean {
  let realFilePath: string;
  let realDirectory: string;

  try {
    realFilePath = fs.realpathSync(filePath);
    realDirectory = fs.realpathSync(directory);
  } catch {
    return false;
  }

  const relative = path.relative(realDirectory, realFilePath);

  // Compare the first segment exactly rather than using startsWith('..'), so
  // a legitimately-contained entry whose name merely begins with dots (e.g.
  // "..hidden.js") isn't mistaken for traversal.
  const [firstSegment] = relative.split(path.sep);

  return relative !== '' && firstSegment !== '..' && !path.isAbsolute(relative);
}

/**
 * Map a candidate adapter path to the module Node should actually load.
 *
 * An adapter installed into `content/adapters` can be a full module directory
 * with its own `package.json`. Node's CommonJS directory resolution honours
 * `main` but ignores `exports` — per spec, `exports` applies only to package
 * specifiers resolved through `node_modules`, never to directory paths — so a
 * package declaring only `exports` would otherwise fail to resolve.
 *
 * We get native `exports` resolution by self-referencing: because the referrer
 * we hand to `createRequire` sits inside the package, requiring the package by
 * its own `name` makes Node resolve through that package's own `exports` field,
 * applying conditions, nesting and subpath rules for us.
 *
 * Anything that isn't a self-referencing module directory — a bare
 * `node_modules` specifier, a plain `index.js` adapter directory, or a package
 * declaring only `main` — is returned untouched so Node's own resolution
 * applies, preserving the behaviour of pre-existing adapters.
 *
 * @NOTE: `require` matches the `require`, `node` and `default` conditions but
 * never `import`, and that isn't overridable (`--conditions` only adds custom
 * conditions). So an ESM-only package whose root export is conditioned solely on
 * `import` (`{".": {"import": "./dist/index.js"}}`) is not resolvable here, even
 * though `require()` would happily load the file it points at. Such a package
 * needs a `require`, `node`, `default` or unconditioned target. Lifting this
 * would mean reading the `exports` field ourselves.
 */
export function resolveAdapterEntryPoint(pathToAdapter: string): string {
  // The node_modules lane passes a bare specifier rather than a path — Node
  // already applies `exports` to those — and a relative read here would be
  // resolved against the cwd, so only absolute directories are considered.
  if (!path.isAbsolute(pathToAdapter)) {
    return pathToAdapter;
  }

  const manifestPath = path.join(pathToAdapter, 'package.json');

  let name: unknown;
  try {
    ({ name } = JSON.parse(fs.readFileSync(manifestPath, 'utf8')));
  } catch {
    // Not a module directory, or an unreadable/malformed manifest.
    return pathToAdapter;
  }

  // Self-referencing requires a package name to reference.
  if (typeof name !== 'string' || !name) {
    return pathToAdapter;
  }

  try {
    const resolved = createRequire(manifestPath).resolve(name);

    // Self-referencing only kicks in when the package declares `exports`.
    // Without it, Node falls back to walking `node_modules` up the tree and
    // can resolve a *different*, same-named package from elsewhere in the
    // install — silently loading an impostor instead of the operator's
    // adapter. Only accept a result that actually lives in the adapter
    // directory; anything else falls back to Node's directory resolution.
    if (!isContainedBy(resolved, pathToAdapter)) {
      return pathToAdapter;
    }

    return resolved;
  } catch {
    // No usable `exports` entry — fall back to Node's directory resolution,
    // which still handles `main` and `index.js`.
    return pathToAdapter;
  }
}

/**
 * Resolve an adapter export to a constructor function, handling both CommonJS and ES module formats.
 */
export function resolveAdapterExport(moduleExport: unknown): AdapterConstructor | null {
  if (!moduleExport) {
    return null;
  }

  if (typeof moduleExport === 'function') {
    return moduleExport as AdapterConstructor;
  }

  if (
    typeof moduleExport === 'object' &&
    'default' in moduleExport &&
    typeof moduleExport.default === 'function'
  ) {
    return moduleExport.default as AdapterConstructor;
  }

  return null;
}

/**
 * Locate and load an adapter constructor by type and class name, trying each of
 * `pathsToAdapters` in order. Shared by the adapter manager and by
 * bin/validate-adapters.ts, so a name resolves — and fails — identically at build
 * time and at runtime.
 */
export function loadAdapterClass(
  adapterType: string,
  adapterClassName: string,
  pathsToAdapters: string[],
  loadAdapterFromPath: (path: string) => unknown,
): AdapterConstructor {
  for (const pathToAdapters of pathsToAdapters) {
    let pathToAdapter = path.join(pathToAdapters, adapterType, adapterClassName);
    if (pathToAdapters === '') {
      // We are loading from node_modules, we can remove the `adapterType` prefix
      pathToAdapter = path.join(pathToAdapters, adapterClassName);
    }
    // An adapter directory may be a full module with its own
    // package.json, in which case this resolves the `exports` entry
    // point; otherwise the path passes through unchanged.
    const moduleToLoad = resolveAdapterEntryPoint(pathToAdapter);

    try {
      const Adapter = resolveAdapterExport(loadAdapterFromPath(moduleToLoad));
      if (Adapter) {
        return Adapter;
      }
    } catch (err) {
      // Catch runtime errors
      if (!(err instanceof Error) || (err as NodeJS.ErrnoException).code !== 'MODULE_NOT_FOUND') {
        throw new errors.IncorrectUsageError({ err: err as Error });
      }

      // Catch missing dependencies BUT NOT missing adapter.
      // Only check the first line — Node appends a "Require stack"
      // that includes the adapter's own path, which would false-positive.
      const firstLine = err.message.split('\n')[0];
      if (!firstLine.includes(pathToAdapter)) {
        // Name the unresolved module so the error is actionable, e.g.
        // "Cannot find module 'superagent'" -> 'superagent'.
        const missingMatch = /Cannot find module '([^']+)'/.exec(firstLine);
        const missingModule = missingMatch ? ` '${missingMatch[1]}'` : '';
        throw new errors.IncorrectUsageError({
          message: `You are missing a dependency${missingModule} in your adapter ${pathToAdapter}`,
          err: err as Error,
        });
      }
    }
  }

  throw new errors.IncorrectUsageError({
    message: `Unable to find ${adapterType} adapter ${adapterClassName} in ${pathsToAdapters}.`,
  });
}
