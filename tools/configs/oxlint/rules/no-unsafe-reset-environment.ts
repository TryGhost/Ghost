import type { CreateRule, ESTree } from '@oxlint/plugins';

const resetEnvironmentStaleFixtures = [
  'baseURL',
  'ghostAccountOwner',
  'page',
  'pageWithAuthenticatedUser',
];

function isBeforeEachHookCall(node: ESTree.Node) {
  if (node.type !== 'CallExpression') {
    return false;
  }

  if (node.callee.type === 'Identifier') {
    return node.callee.name === 'beforeEach';
  }

  return (
    node.callee.type === 'MemberExpression' &&
    node.callee.property.type === 'Identifier' &&
    node.callee.property.name === 'beforeEach'
  );
}

function isFunctionNode(
  node: ESTree.Node,
): node is ESTree.Function | ESTree.ArrowFunctionExpression {
  return (
    node.type === 'ArrowFunctionExpression' ||
    node.type === 'FunctionExpression' ||
    node.type === 'FunctionDeclaration'
  );
}

function getDestructuredFixtureNames(
  functionNode: ESTree.Function | ESTree.ArrowFunctionExpression,
) {
  const [firstParam] = functionNode.params;
  if (!firstParam || firstParam.type !== 'ObjectPattern') {
    return new Set<string>();
  }

  const fixtureNames = new Set<string>();
  for (const property of firstParam.properties) {
    if (property.type !== 'Property') {
      continue;
    }

    if (property.key.type === 'Identifier') {
      fixtureNames.add(property.key.name);
    }
  }

  return fixtureNames;
}

export const noUnsafeResetEnvironment: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Restrict resetEnvironment() to supported beforeEach hooks',
    },
    messages: {
      invalidLocation:
        'resetEnvironment() is only supported inside beforeEach hooks. Use a beforeEach hook or switch the file to usePerTestIsolation().',
      invalidFixtures:
        'Do not resolve {{fixtures}} in the same beforeEach hook as resetEnvironment(); those fixtures become stale after a recycle.',
    },
  },
  create(context) {
    return {
      CallExpression(node) {
        if (isBeforeEachHookCall(node)) {
          const callback = node.arguments.find((argument) => isFunctionNode(argument));
          if (!callback) {
            return;
          }

          const fixtureNames = getDestructuredFixtureNames(callback);
          if (!fixtureNames.has('resetEnvironment')) {
            return;
          }

          const staleFixtures = resetEnvironmentStaleFixtures.filter((fixtureName) =>
            fixtureNames.has(fixtureName),
          );
          if (staleFixtures.length > 0) {
            context.report({
              node: callback,
              messageId: 'invalidFixtures',
              data: {
                fixtures: staleFixtures.map((fixtureName) => `"${fixtureName}"`).join(', '),
              },
            });
          }

          return;
        }

        if (node.callee.type !== 'Identifier' || node.callee.name !== 'resetEnvironment') {
          return;
        }

        const ancestors: ESTree.Node[] = [];
        for (let ancestor: ESTree.Node | null = node.parent; ancestor; ancestor = ancestor.parent) {
          ancestors.unshift(ancestor);
        }
        const enclosingBeforeEachHook = [...ancestors]
          .reverse()
          .find(
            (ancestor) =>
              isFunctionNode(ancestor) && ancestor.parent && isBeforeEachHookCall(ancestor.parent),
          );

        if (!enclosingBeforeEachHook) {
          context.report({
            node,
            messageId: 'invalidLocation',
          });
        }
      },
    };
  },
};
