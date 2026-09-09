import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  typescript: false,
  extraTestRules: {
    // The spec for the PascalCase service class is PascalCase too.
    'ghost/filenames/match-regex': 'off',
    // Tests throw native errors as unreachable-path guards.
    'ghost/ghost-custom/no-native-error': 'off',
  },
  extraBlocks: [
    {
      // The service class file is PascalCase, matching the exported class.
      files: ['lib/LimitService.js'],
      rules: { 'ghost/filenames/match-regex': 'off' },
    },
  ],
});
