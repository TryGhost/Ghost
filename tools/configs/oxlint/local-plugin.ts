import type { Plugin } from '@oxlint/plugins';

import { noHardcodedGhostPaths } from './rules/no-hardcoded-ghost-paths.ts';
import { noUnsafeResetEnvironment } from './rules/no-unsafe-reset-environment.ts';

const plugin: Plugin = {
  rules: {
    'no-hardcoded-ghost-paths': noHardcodedGhostPaths,
    'no-unsafe-reset-environment': noUnsafeResetEnvironment,
  },
};

export default plugin;
