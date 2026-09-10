import { nodeLibConfig } from '@internal/cfg-eslint';

// `./structure` exists so that a renderer can have the shape of a field type without the
// rules for validating one. Portal is the renderer that made it worth doing: it loads on
// every page view of every themed site, and the rules next door are built on zod, which
// costs about seventeen kilobytes gzipped that a renderer never runs.
//
// Nothing in a bundler holds that. `./structure` is cheap only for as long as it depends
// on nothing, and one import here — or one reached through it — is enough to put whatever
// it pulls in front of every visitor to every Ghost site, with every check still green.
// So the constraint is stated as a rule rather than left to whoever edits the file next.
const structureDependsOnNothing = {
  files: ['src/structure.ts'],
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['*', '**', './*', '../*'],
            message:
              'structure.ts must depend on nothing — Portal bundles it on every page view of every Ghost site, so whatever this reaches ships to every visitor. Anything needing an import belongs in index.ts.',
          },
        ],
      },
    ],
  },
};

export default nodeLibConfig({ extraBlocks: [structureDependsOnNothing] });
