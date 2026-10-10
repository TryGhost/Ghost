import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { Plugin } from 'vite';

/**
 * Pre-bundles Shade and admin-x-framework for the acceptance suite.
 *
 * Every spec file boots the app in a fresh iframe, which loads each source
 * module again. Served as source, these two packages add ~200 modules per
 * spec; bundled, they add a handful. The bundle still comes from their
 * TypeScript source (the `source` export condition in vite.shared.ts).
 */

const APPS_PATH = path.resolve(__dirname, '..');
const SHADE_SRC = path.join(APPS_PATH, 'shade/src') + path.sep;

const PACKAGES = [
  { name: '@tryghost/shade', dir: 'shade' },
  { name: '@tryghost/admin-x-framework', dir: 'admin-x-framework' },
];

// Node-only and test-only entry points stay out of the browser bundle.
const SKIPPED_EXPORT = /\.(css|json)$|^\.\/(test|vite|playwright)\b/;

function readExports(dir: string): string[] {
  const pkg = JSON.parse(readFileSync(path.join(APPS_PATH, dir, 'package.json'), 'utf8')) as {
    exports: Record<string, unknown>;
  };
  return Object.keys(pkg.exports);
}

function listFiles(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => path.join(entry.parentPath, entry.name))
    .sort();
}

/** Every browser entry point the packages export, with `./api/*` expanded. */
export function workspaceDepEntries(): string[] {
  return PACKAGES.flatMap(({ name, dir }) =>
    readExports(dir)
      .filter((key) => !SKIPPED_EXPORT.test(key))
      .flatMap((key) => {
        if (key === '.') {
          return [name];
        }
        if (key.endsWith('/*')) {
          const subdir = key.slice(2, -2);
          return readdirSync(path.join(APPS_PATH, dir, 'src', subdir))
            .filter((file) => file.endsWith('.ts'))
            .map((file) => `${name}/${subdir}/${file.slice(0, -3)}`);
        }
        return [`${name}/${key.slice(2)}`];
      }),
  );
}

/**
 * Vite keys its pre-bundle cache on the lockfile and config, not on linked
 * sources. This hash goes into the config so edited sources re-bundle.
 */
export function workspaceDepsHash(): string {
  const hash = createHash('sha256');
  for (const { dir } of PACKAGES) {
    for (const file of listFiles(path.join(APPS_PATH, dir, 'src'))) {
      hash.update(file).update(readFileSync(file));
    }
  }
  return hash.digest('hex').slice(0, 16);
}

/**
 * Teaches the pre-bundler what Shade's own Vite config does: the `@/` alias,
 * and the eager `import.meta.glob` that builds the Icon set. Without it, the
 * bundler leaves `@/` imports as separate source modules and the glob empty.
 */
export function shadeSourcePlugin(): Plugin {
  return {
    name: 'acceptance-shade-source',
    resolveId(id, importer) {
      // `?react` SVG imports stay external, so svgr still turns them into components.
      if (id.startsWith('@/') && !id.includes('?') && importer?.startsWith(SHADE_SRC)) {
        return this.resolve(SHADE_SRC + id.slice(2), importer, { skipSelf: true });
      }
      return null;
    },
    transform(code, id) {
      if (!id.startsWith(SHADE_SRC) || !code.includes('import.meta.glob')) {
        return null;
      }
      const imports: string[] = [];
      const expanded = code.replace(
        /import\.meta\.glob[^(]*\(\s*'([^']+)\/\*(\.\w+)',\s*\{\s*eager:\s*true,\s*query:\s*'([^']+)',?\s*\}\s*\)/g,
        (_match, dir: string, extension: string, query: string) => {
          const files = readdirSync(path.resolve(path.dirname(id), dir))
            .filter((file) => file.endsWith(extension))
            .sort();
          const entries = files.map((file) => {
            const binding = `__acceptanceGlob${imports.length}`;
            const source = path.resolve(path.dirname(id), dir, file) + query;
            imports.push(`import * as ${binding} from ${JSON.stringify(source)};`);
            return `${JSON.stringify(`${dir}/${file}`)}: ${binding}`;
          });
          return `{${entries.join(', ')}}`;
        },
      );
      if (expanded === code) {
        throw new Error(`Unsupported import.meta.glob in ${id}; extend shadeSourcePlugin`);
      }
      return `${imports.join('\n')}\n${expanded}`;
    },
  };
}
