// beforeAll and afterAll are the unit project's globals rather than imports:
// CommonJS test files require() this module, and Vitest can't be required.

interface HandlebarsRegistry {
  helpers: Record<string, unknown>;
  partials: Record<string, unknown>;
  registerHelper(name: string, helper: unknown): void;
  unregisterHelper(name: string): void;
  registerPartial(name: string, partial: unknown): void;
  unregisterPartial(name: string): void;
}

// The theme engine's Handlebars instance, which every helper and template shares
const themeHandlebars: HandlebarsRegistry =
  require('../../core/frontend/services/theme-engine/engine').handlebars;

function restoreEntries(
  current: Record<string, unknown>,
  saved: Record<string, unknown>,
  register: (name: string, value: unknown) => void,
  unregister: (name: string) => void,
) {
  for (const name of Object.keys(current)) {
    if (!(name in saved)) {
      unregister(name);
    }
  }
  for (const [name, value] of Object.entries(saved)) {
    if (current[name] !== value) {
      register(name, value);
    }
  }
}

/**
 * Records the helpers and partials registered on the theme Handlebars instance,
 * and returns a function that puts them back.
 */
export function snapshotHandlebars(handlebars: HandlebarsRegistry = themeHandlebars): () => void {
  const helpers = { ...handlebars.helpers };
  const partials = { ...handlebars.partials };

  return () => {
    restoreEntries(
      handlebars.helpers,
      helpers,
      (name, helper) => handlebars.registerHelper(name, helper),
      (name) => handlebars.unregisterHelper(name),
    );
    restoreEntries(
      handlebars.partials,
      partials,
      (name, partial) => handlebars.registerPartial(name, partial),
      (name) => handlebars.unregisterPartial(name),
    );
  };
}

/**
 * Call first in a describe block that registers Handlebars helpers or
 * partials: they are put back as they were once the block finishes.
 *
 * Unit test files share one module registry per worker, so a helper or partial
 * a file registers, such as a stand-in helper or a test template partial, is
 * otherwise still registered for whichever file runs next. A file that renders
 * with a helper it never registered then passes only after one that did.
 */
export function restoreHandlebarsAfterSuite(): void {
  let restore: () => void = () => {};

  beforeAll(function () {
    restore = snapshotHandlebars();
  });

  afterAll(function () {
    restore();
  });
}

interface HelperService {
  registerHelper(name: string, helper: unknown): void;
  registerAlias(alias: string, name: string): void;
  init(): void;
}

// The theme helper service remembers every name it has registered and skips it
// next time, even once the helper itself is gone from Handlebars
const helperServiceModules = ['index', 'registry', 'register-ghost-helpers'].map((name) =>
  require.resolve(`../../core/frontend/services/helpers/${name}`),
);

/**
 * Call in a describe block that registers helpers through Ghost's helper
 * service, alongside restoreHandlebarsAfterSuite(). The block gets a fresh copy
 * of the service, so the names it registers don't stay remembered by the shared
 * one: there, a later helpers.init() would skip them and leave them missing.
 *
 * @returns a getter for the block's copy of the service
 */
export function freshHelperServiceForSuite(): () => HelperService {
  let saved: (NodeJS.Module | undefined)[] = [];
  let service: HelperService | undefined;

  beforeAll(function () {
    saved = helperServiceModules.map((modulePath) => require.cache[modulePath]);
    for (const modulePath of helperServiceModules) {
      delete require.cache[modulePath];
    }
    service = require(helperServiceModules[0]);
  });

  afterAll(function () {
    helperServiceModules.forEach((modulePath, index) => {
      delete require.cache[modulePath];
      if (saved[index]) {
        require.cache[modulePath] = saved[index];
      }
    });
    service = undefined;
  });

  return () => {
    if (!service) {
      throw new Error('The helper service is only available while its describe block runs');
    }
    return service;
  };
}
