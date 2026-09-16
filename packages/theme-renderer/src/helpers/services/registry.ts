/* eslint-disable @typescript-eslint/no-explicit-any */
// Copied from ghost/core/core/frontend/services/helpers/registry.js @ 407e032dc7 —
// transforms: CJS → ESM; module-level singleton → factory over an injected
// HelperRegistrar so the helpers layer never imports the engine directly.
import { registerAsyncThemeHelper, registerThemeHelper } from './handlebars.ts';
import type { HelperRegistrar } from '../../seam/types.ts';

export interface HelperRegistry {
  registerHelper(name: string, helperFn: any): void;
  registerAlias(alias: string, name: string): void;
}

export function createHelperRegistry(registrar: HelperRegistrar): HelperRegistry {
  // Internal Cache
  const registry: Record<string, any> = {};

  const registerHelper = (name: string, helperFn: any) => {
    if (registry[name]) {
      return;
    }

    registry[name] = helperFn;

    if (helperFn.async) {
      registerAsyncThemeHelper(registrar, name, helperFn);
    } else {
      registerThemeHelper(registrar, name, helperFn);
    }

    if (helperFn.alias) {
      registerHelper(helperFn.alias, helperFn);
    }
  };

  const registerAlias = (alias: string, name: string) => {
    registerHelper(alias, registry[name]);
  };

  return {
    registerAlias,
    registerHelper,
  };
}
