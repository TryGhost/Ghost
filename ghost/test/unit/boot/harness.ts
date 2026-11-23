import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const BOOTSTRAP = resolve(__dirname, '../../../bootstrap');
// The phases of Ghost's start that were phases of core/boot.js.
const PHASES_FILE = 'transition/boot-steps.ts';

export type BootFunction = (args: Record<string, unknown>) => Promise<void>;

type Options = {
  // Answers a dependency the test did not list. Without it, an unlisted dependency fails the test.
  fallback?: (name: string) => unknown;
  // Extra globals for the file, such as `process`.
  globals?: Record<string, unknown>;
};

const compiled = new Map<string, string>();

// A file of ghost/bootstrap compiled to the CommonJS the build produces.
function compile(file: string) {
  const source = readFileSync(resolve(BOOTSTRAP, file), 'utf8');
  let output = compiled.get(source);
  if (output === undefined) {
    output = ts.transpileModule(source, {
      fileName: file,
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    compiled.set(source, output);
  }
  return output;
}

/**
 * Loads a file of ghost/bootstrap with `require` answered from `modules`, so a test can drive
 * what it orchestrates without booting the services it calls. A module is named as core/boot.js
 * named it, from core: `./server/services/tiers`.
 */
export function loadBootstrapFile(
  file: string,
  modules: Record<string, unknown>,
  { fallback, globals = {} }: Options = {},
): Record<string, BootFunction> {
  const available: Record<string, unknown> = {
    '@tryghost/debug': () => () => {},
    ...modules,
  };
  const module = { exports: {} as Record<string, BootFunction> };
  const context = {
    ...globals,
    require(dependency: string) {
      const name = dependency.replace(/^(?:\.\.\/)+core\//, './');
      if (Object.hasOwn(available, name)) {
        return available[name];
      }
      assert.ok(fallback, `Unexpected boot dependency: ${dependency}`);
      return fallback(name);
    },
    module,
    exports: module.exports,
  };
  runInNewContext(compile(file), context);
  return module.exports;
}

/** Loads one of the phases that were phases of core/boot.js. */
export function loadBootFunction(
  name: string,
  modules: Record<string, unknown>,
  options: Options = {},
): BootFunction {
  const phases = loadBootstrapFile(PHASES_FILE, modules, options);
  const phase = phases[name];
  assert.equal(typeof phase, 'function', `${PHASES_FILE} exports no phase ${name}`);
  return phase!;
}
