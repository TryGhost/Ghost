import type { CreateRule, ESTree, Scope, Variable } from '@oxlint/plugins';

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
    const sourceCode = context.sourceCode;
    const errors = new Set<Variable>();
    const calls: { node: ESTree.Node; method: string; name: string; target?: Variable }[] = [];

    // Resolve by binding, so a same-named error in another scope doesn't count.
    function variable(identifier: Extract<ESTree.Node, { type: 'Identifier' }>) {
      for (let scope: Scope | null = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const found = scope.set.get(identifier.name);
        if (found) return found;
      }
      return undefined;
    }
    function track(identifier: Extract<ESTree.Node, { type: 'Identifier' }>) {
      const found = variable(identifier);
      if (found) errors.add(found);
    }

    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && node.init?.type === 'NewExpression') {
          track(node.id);
        }
      },
      AssignmentExpression(node) {
        if (node.left.type === 'Identifier' && node.right.type === 'NewExpression') {
          track(node.left);
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
          calls.push({
            node: expected,
            method: callee.property.name,
            name: expected.name,
            target: variable(expected),
          });
        }
      },
      'Program:exit'() {
        for (const { node, method, name, target } of calls) {
          if (target && errors.has(target)) {
            context.report({ node, messageId: 'instance', data: { method, name } });
          }
        }
      },
    };
  },
};
