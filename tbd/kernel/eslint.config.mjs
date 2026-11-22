import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  extraSrcRules: {
    // TypeScript checks overloads; the base rule reads each signature as a redeclaration.
    'no-redeclare': 'off',
  },
});
