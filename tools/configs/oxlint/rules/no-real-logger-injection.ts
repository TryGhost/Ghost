import type { CreateRule, ESTree, Scope, Variable } from '@oxlint/plugins';

const loggerKeys = new Set(['logging', 'logger']);

function requiredModule(node: ESTree.Expression | null | undefined) {
  if (node?.type !== 'CallExpression' || node.callee.type !== 'Identifier') return;
  if (node.callee.name !== 'require') return;
  const [source] = node.arguments;
  return source?.type === 'Literal' ? source.value : undefined;
}

// A class that receives its logger is tested by passing a fake it can assert on.
export const noRealLoggerInjection: CreateRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Pass createLoggingFake() to classes under test, not the real logger' },
    schema: [],
    messages: {
      real: 'This passes the real @tryghost/logging to a class under test. Pass createLoggingFake() from test/utils/logging-utils and assert on it.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const bindings = new Set<Variable>();

    // Resolve by binding, so a fake that shadows the imported name is not reported.
    function variable(identifier: Extract<ESTree.Node, { type: 'Identifier' }>) {
      for (let scope: Scope | null = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const found = scope.set.get(identifier.name);
        if (found) return found;
      }
      return undefined;
    }
    function track(identifier: Extract<ESTree.Node, { type: 'Identifier' }>) {
      const found = variable(identifier);
      if (found) bindings.add(found);
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value !== '@tryghost/logging') return;
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier') track(specifier.local);
        }
      },
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && requiredModule(node.init) === '@tryghost/logging') {
          track(node.id);
        }
      },
      NewExpression(node) {
        for (const argument of node.arguments) {
          if (argument.type !== 'ObjectExpression') continue;
          for (const property of argument.properties) {
            if (
              property.type === 'Property' &&
              property.key.type === 'Identifier' &&
              loggerKeys.has(property.key.name) &&
              property.value.type === 'Identifier'
            ) {
              const found = variable(property.value);
              if (found && bindings.has(found)) {
                context.report({ node: property, messageId: 'real' });
              }
            }
          }
        }
      },
    };
  },
};
