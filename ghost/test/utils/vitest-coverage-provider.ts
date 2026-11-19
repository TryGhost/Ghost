// V8 coverage for the unit suite, wrapping @vitest/coverage-v8.
//
// Ghost source reaches V8 two ways in a unit run. A test file's `import` goes
// through vitest's module runner, which runs vite's transform of the file.
// Everything Ghost source itself `require()`s, and every test `require()`,
// goes through Node, which runs the file as-is or, for `.ts`, tsx's output.
// One file can be loaded both ways in the same worker, and V8 reports each
// copy as its own script under the same URL.
//
// @vitest/coverage-v8 assumes every script is the vite copy: it merges all
// scripts that share a URL and maps the counts onto vite's transform of the
// file. For a script Node ran, those offsets point into different code, so the
// counts land on the wrong lines; with both copies merged, both are wrong.
//
// So the worker records the code Node compiles for each file, and tags the
// V8 entries for those scripts with their own URL. The main process maps a
// tagged entry onto the recorded code (and tsx's inline source map), and
// everything else goes through @vitest/coverage-v8 as before.
//
// Line counts come out right. Statement, function and branch totals are a
// little noisy: tsx's CommonJS wrapper and helpers map onto import and export
// lines, and where vite's and tsx's source maps disagree on where a statement
// ends, istanbul keeps both copies of it.

import Module from 'node:module';
import { fileURLToPath } from 'node:url';
import v8CoverageModule from '@vitest/coverage-v8';
import type { CoverageProvider, CoverageProviderModule } from 'vitest/node';

// Appended to the URL of an entry for a script Node compiled.
const NODE_SCRIPT_TAG = '#node-require';

type ScriptCoverage = {
  scriptId: string;
  url: string;
  startOffset?: number;
  functions: { ranges: { startOffset: number; endOffset: number }[] }[];
};
type WorkerCoverage = { result: ScriptCoverage[]; nodeSources?: Record<string, string> };

const compiledByNode = new Map<string, string>();
const sentSources = new Set<string>();
const nodeScriptIds = new Set<string>();
const HOOKED = Symbol.for('ghost.test.coverageCompileHook');

function recordNodeCompiles(): void {
  const proto = Module.prototype as unknown as {
    _compile: (content: string, filename: string, ...rest: unknown[]) => unknown;
    [HOOKED]?: boolean;
  };
  if (proto[HOOKED]) {
    return;
  }
  proto[HOOKED] = true;

  const originalCompile = proto._compile;
  proto._compile = function compile(content, filename, ...rest) {
    if (!filename.includes('/node_modules/')) {
      compiledByNode.set(filename, content);
    }
    return originalCompile.call(this, content, filename, ...rest);
  };
}

// The outermost range of a CommonJS script spans exactly the compiled code; a
// module-runner script also spans vitest's wrapper, so the lengths tell them apart.
// Later snapshots can omit that range, so remember the script by id.
function isScriptNodeCompiled(entry: ScriptCoverage, code: string): boolean {
  if (nodeScriptIds.has(entry.scriptId)) {
    return true;
  }
  if (entry.functions[0]?.ranges[0]?.endOffset !== code.length) {
    return false;
  }
  nodeScriptIds.add(entry.scriptId);
  return true;
}

function tagNodeScripts(coverage: WorkerCoverage): WorkerCoverage {
  const nodeSources: Record<string, string> = {};

  for (const entry of coverage.result) {
    const code = compiledByNode.get(fileURLToPath(entry.url));
    if (code === undefined || !isScriptNodeCompiled(entry, code)) {
      continue;
    }

    entry.url += NODE_SCRIPT_TAG;
    // Set from the module runner's wrapper for this path; Node adds no wrapper.
    entry.startOffset = 0;

    // Each worker sends a file's code once; the main process keeps it for the run.
    if (!sentSources.has(entry.url)) {
      sentSources.add(entry.url);
      nodeSources[entry.url] = code;
    }
  }

  return { ...coverage, nodeSources };
}

const INLINE_SOURCE_MAP =
  /\/\/# sourceMappingURL=data:application\/json(?:;charset=[^;,]+)?;base64,([A-Za-z0-9+/=]+)\s*$/;

function inlineSourceMap(code: string, url: string) {
  const match = INLINE_SOURCE_MAP.exec(code);
  if (!match) {
    return undefined;
  }

  const map = JSON.parse(Buffer.from(match[1], 'base64').toString('utf8'));
  map.sources = (map.sources ?? []).map((source: string) => new URL(source, url).href);
  return map;
}

type Sources = { code: string; map?: unknown };

// The parts of @vitest/coverage-v8's provider this module overrides.
interface V8CoverageProviderBase {
  readCoverageFiles(options: { onFileRead: (coverage: WorkerCoverage) => void }): Promise<void>;
  getSources(url: string, ...rest: unknown[]): Promise<Sources>;
}

async function createProvider(): Promise<CoverageProvider> {
  // Main-process only: keeps vitest/node out of the workers.
  const { V8CoverageProvider } =
    (await import('@vitest/coverage-v8/dist/provider.js')) as unknown as {
      V8CoverageProvider: new () => V8CoverageProviderBase;
    };

  const provider = new (class GhostV8CoverageProvider extends V8CoverageProvider {
    nodeSources = new Map<string, string>();

    readCoverageFiles(options: { onFileRead: (coverage: WorkerCoverage) => void }) {
      return super.readCoverageFiles({
        ...options,
        onFileRead: (coverage: WorkerCoverage) => {
          for (const [url, code] of Object.entries(coverage.nodeSources ?? {})) {
            // Vitest decodes coverage URLs before looking up their sources.
            this.nodeSources.set(decodeURIComponent(url), code);
          }
          options.onFileRead(coverage);
        },
      });
    }

    async getSources(url: string, ...rest: unknown[]): Promise<Sources> {
      const code = this.nodeSources.get(url);
      if (code === undefined) {
        return super.getSources(url, ...rest);
      }
      return { code, map: inlineSourceMap(code, url) };
    }
  })();
  // Typed above only as far as this module touches it.
  return provider as unknown as CoverageProvider;
}

const coverageModule: CoverageProviderModule = {
  ...v8CoverageModule,

  async startCoverage(runtimeOptions) {
    recordNodeCompiles();
    return v8CoverageModule.startCoverage?.(runtimeOptions);
  },

  async takeCoverage(options) {
    const coverage = (await v8CoverageModule.takeCoverage?.(options)) as WorkerCoverage;
    return tagNodeScripts(coverage);
  },

  getProvider: createProvider,
};

export default coverageModule;
