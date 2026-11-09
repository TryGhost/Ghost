import type { CreateRule } from '@oxlint/plugins';

// Migrated from eslint-plugin-ghost. Preserve its matching behavior.
export const nodeAssertMethods: CreateRule = {
  meta: {
    docs: {
      description: 'Enforce using methods with node:assert',
      category: 'Ghost',
      recommended: false,
    },
    messages: {
      requireMethod: 'Use assert with a specific method like assert.equal() or assert.ok()',
    },
  },
  create(context) {
    return {
      'CallExpression[callee.name=assert]': function (node) {
        if (node.parent?.type !== 'MemberExpression') {
          // Report invalid usage of assert()
          context.report({
            node: node,
            messageId: 'requireMethod',
          });
        }
      },
    };
  },
};
