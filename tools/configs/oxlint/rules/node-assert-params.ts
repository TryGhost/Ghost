import type { CreateRule } from '@oxlint/plugins';

// Migrated from eslint-plugin-ghost. Preserve its matching behavior.
export const nodeAssertParams: CreateRule = {
  meta: {
    docs: {
      description: 'Enforce correct order of params in node:assert methods',
      category: 'Ghost',
      recommended: false,
    },
    messages: {
      forceOrder: 'Calls to assert methods should pass "actual" followed by "expected".',
    },
  },
  create(context) {
    const assertFns = [
      'deepEqual',
      'deepStrictEqual',
      'equal',
      'strictEqual',
      'notDeepEqual',
      'notDeepStrictEqual',
      'notEqual',
      'notStrictEqual',
    ];

    return {
      'CallExpression[callee.object.name=assert]': function (node) {
        if (
          !(
            node &&
            node.type === 'CallExpression' &&
            !node.optional &&
            node.arguments.length >= 2 &&
            node.callee.type === 'MemberExpression' &&
            !node.callee.optional
          )
        ) {
          return;
        }

        // Method names we check
        // @TODO use eslint community utils here
        // ref: https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/rules/prefer-json-parse-buffer.js#L127
        if (
          node.callee.property.type !== 'Identifier' ||
          !assertFns.includes(node.callee.property.name)
        ) {
          return;
        }

        const firstArg = node.arguments[0];
        if (!firstArg) return;

        // The first argument must not be a Literal, or an Idenfier with the name "undefined"
        if (
          firstArg.type === 'Literal' ||
          firstArg.type === 'ArrayExpression' ||
          firstArg.type === 'ObjectExpression' ||
          (firstArg.type === 'Identifier' && firstArg.name === 'undefined')
        ) {
          context.report({ node, messageId: 'forceOrder' });
        }

        return;
      },
    };
  },
};
