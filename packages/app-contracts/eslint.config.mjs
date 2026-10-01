import { nodeLibConfig } from '@internal/cfg-eslint';

// The root entry point is what every consumer can afford, including code that ships to
// browsers and never validates anything. It stays that way only for as long as it and
// the modules it loads at runtime do not reach zod, and nothing in a bundler holds that,
// so it is stated as a rule.
const rootDependsOnNothing = {
  files: ['src/index.ts', 'src/manifest/id.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'zod',
            message:
              "The root entry point must not load zod. Validation belongs in a contract's own entry point, such as ./manifest.",
          },
        ],
      },
    ],
  },
};

export default nodeLibConfig({ extraBlocks: [rootDependsOnNothing] });
