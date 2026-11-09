import type { CreateRule } from '@oxlint/plugins';

// Migrated from eslint-plugin-ghost's no-native-error rule.
export const noNativeError: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Enforce use of @tryghost/errors',
    },
    schema: [],
    messages: {
      nativeError: 'Direct calls to new Error() are not allowed. Please use @tryghost/errors.',
    },
  },
  create(context) {
    return {
      NewExpression(node) {
        if (node.callee.type === 'Identifier' && node.callee.name === 'Error') {
          context.report({ node, messageId: 'nativeError' });
        }
      },
    };
  },
};
