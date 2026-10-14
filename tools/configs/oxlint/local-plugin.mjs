import noHardcodedGhostPaths from './rules/no-hardcoded-ghost-paths.mjs';
import noUnsafeResetEnvironment from './rules/no-unsafe-reset-environment.mjs';

export default {
  rules: {
    'no-hardcoded-ghost-paths': noHardcodedGhostPaths,
    'no-unsafe-reset-environment': noUnsafeResetEnvironment,
  },
};
