import { nodeLibConfig } from '@internal/cfg-eslint';

export default nodeLibConfig({
  extraBlocks: [
    {
      // The entry point declares the event bus and its type under one name,
      // which is what lets `DomainEvents` be used as a value and as a type.
      // ESLint reads that as a redeclaration. TypeScript still rejects real
      // ones, so the rule is off for this one file only.
      files: ['src/index.ts'],
      rules: { 'no-redeclare': 'off' },
    },
  ],
});
