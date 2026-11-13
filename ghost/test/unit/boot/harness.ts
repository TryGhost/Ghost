import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

const BOOT_PATH = resolve(__dirname, '../../../core/boot.ts');

const compiled = new Map<string, string>();

/**
 * Boot's source compiled to the CommonJS the build produces, so that it runs here whether it is
 * written in JavaScript or TypeScript. Compiled once for each version of the source.
 */
function compileBoot(): string {
  const source = readFileSync(BOOT_PATH, 'utf8');
  let output = compiled.get(source);
  if (output === undefined) {
    output = ts.transpileModule(source, {
      fileName: BOOT_PATH,
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2024,
        esModuleInterop: true,
      },
    }).outputText;
    compiled.set(source, output);
  }
  return output;
}

export type BootFunction = (args: Record<string, unknown>) => Promise<void>;

type Options = {
  // Answers a dependency the test did not list. Without it, an unlisted dependency fails the test.
  fallback?: (name: string) => unknown;
  // Extra globals for boot.ts, such as `process`.
  globals?: Record<string, unknown>;
};

/**
 * Loads one boot phase from core/boot.ts with `require` answered from `modules`, so a test can
 * drive that phase's orchestration without booting the services it calls.
 */
export function loadBootFunction(
  name: string,
  modules: Record<string, unknown>,
  { fallback, globals = {} }: Options = {},
): BootFunction {
  const available: Record<string, unknown> = {
    // Loaded at the top of boot.ts by every phase.
    './server/overrides': {},
    '@tryghost/debug': () => () => {},
    ...modules,
  };
  const module = { exports: {} };
  const context = {
    ...globals,
    require(dependency: string) {
      if (Object.hasOwn(available, dependency)) {
        return available[dependency];
      }
      assert.ok(fallback, `Unexpected boot dependency: ${dependency}`);
      return fallback(dependency);
    },
    module,
    exports: module.exports,
  };
  return runInNewContext(`${compileBoot()}\n${name};`, context);
}
