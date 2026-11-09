import type { CreateRule, ESTree } from '@oxlint/plugins';

// assert.rejects and assert.throws compare an Error object by name and message,
// so a different error with the same message still passes.
export const noAssertErrorInstance: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Check rethrown errors by identity rather than by comparing an Error object',
    },
    schema: [],
    messages: {
      instance:
        'assert.{{method}} only compares the name and message of {{name}}. Use (thrown) => thrown === {{name}} to check it is the same error.',
    },
  },
  create(context) {
    const errors = new Set<string>();
    const calls: { node: ESTree.Node; method: string; name: string }[] = [];

    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && node.init?.type === 'NewExpression') {
          errors.add(node.id.name);
        }
      },
      AssignmentExpression(node) {
        if (node.left.type === 'Identifier' && node.right.type === 'NewExpression') {
          errors.add(node.left.name);
        }
      },
      CallExpression(node) {
        const { callee } = node;
        const expected = node.arguments[1];
        if (
          callee.type === 'MemberExpression' &&
          callee.object.type === 'Identifier' &&
          callee.object.name === 'assert' &&
          callee.property.type === 'Identifier' &&
          ['rejects', 'throws'].includes(callee.property.name) &&
          expected?.type === 'Identifier'
        ) {
          calls.push({ node: expected, method: callee.property.name, name: expected.name });
        }
      },
      'Program:exit'() {
        for (const { node, method, name } of calls) {
          if (errors.has(name)) {
            context.report({ node, messageId: 'instance', data: { method, name } });
          }
        }
      },
    };
  },
};
