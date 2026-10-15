import type { CreateRule, ESTree, Scope, Variable } from '@oxlint/plugins';

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import boundaries from '../../../../.dependency-cruiser.cjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
// Reuse the native boundary rule: $1 denotes internal service files, not libraries.
const boundary = Array.isArray(boundaries?.forbidden)
  ? boundaries.forbidden.find((rule) => rule?.name === 'service-dependencies')
  : undefined;
if (
  typeof boundary?.from?.path !== 'string' ||
  !Array.isArray(boundary.to?.pathNot) ||
  !boundary.to.pathNot.every((pattern) => typeof pattern === 'string')
) {
  throw new Error(
    'ghost/no-injected-service-libraries: .dependency-cruiser.cjs must define ' +
      'service-dependencies with a string from.path and a string array to.pathNot',
  );
}
const services = new RegExp(boundary.from.path);
const libraries = boundary.to.pathNot
  .filter((pattern) => !pattern.includes('$1'))
  .map((pattern) => new RegExp(pattern));

function unwrap(node: ESTree.Node | null | undefined) {
  while (
    node &&
    (node.type === 'TSAsExpression' ||
      node.type === 'TSSatisfiesExpression' ||
      node.type === 'TSNonNullExpression' ||
      node.type === 'TSTypeAssertion' ||
      node.type === 'AwaitExpression')
  ) {
    node = node.type === 'AwaitExpression' ? node.argument : node.expression;
  }
  return node;
}

export const noInjectedServiceLibraries: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Import allowlisted libraries directly instead of injecting them into services',
    },
    schema: [],
    messages: {
      directImport:
        'Import {{library}} directly in the implementation instead of passing it into this service constructor.',
    },
  },
  create(context) {
    const filename = path.relative(root, context.filename).split(path.sep).join('/');
    if (
      !/^ghost\/core\/server\/services\/[^/]+\/index\.ts$/.test(filename) ||
      !services.test(filename)
    ) {
      return {};
    }
    const directory = path.posix.dirname(filename);
    const sourceCode = context.sourceCode;

    function variable(
      identifier: Extract<ESTree.Node, { type: 'Identifier' }>,
    ): Variable | undefined {
      for (let scope: Scope | null = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const binding = scope.set.get(identifier.name);
        if (binding) return binding;
      }
      return undefined;
    }

    // Follow imported bindings and literal require() calls, not arbitrary value flow.
    function importedFrom(expression: ESTree.Node | null | undefined): string | undefined {
      const node = unwrap(expression);
      if (!node) return;
      if (node.type === 'MemberExpression') return importedFrom(node.object);
      if (
        node.type === 'ImportExpression' &&
        node.source.type === 'Literal' &&
        typeof node.source.value === 'string'
      )
        return node.source.value;
      if (
        node.type === 'CallExpression' &&
        node.callee.type === 'Identifier' &&
        node.callee.name === 'require'
      ) {
        if (variable(node.callee)?.defs.length) return;
        const argument = node.arguments[0];
        if (
          node.arguments.length === 1 &&
          argument?.type === 'Literal' &&
          typeof argument.value === 'string'
        ) {
          return argument.value;
        }
      }
      if (node.type !== 'Identifier') return;
      const binding = variable(node);
      const definition = binding?.defs[0];
      if (
        definition?.type === 'ImportBinding' &&
        (definition.parent && 'importKind' in definition.parent
          ? definition.parent.importKind
          : undefined) !== 'type' &&
        ('importKind' in definition.node ? definition.node.importKind : undefined) !== 'type'
      ) {
        if (definition.parent?.type === 'ImportDeclaration') return definition.parent.source.value;
        if (
          definition.node.type === 'TSImportEqualsDeclaration' &&
          definition.node.moduleReference.type === 'TSExternalModuleReference'
        )
          return definition.node.moduleReference.expression.value;
      }
      // const require bindings cannot be reassigned; aliases and mutable bags need review.
      if (
        definition?.type === 'Variable' &&
        definition.parent?.type === 'VariableDeclaration' &&
        definition.parent.kind === 'const' &&
        definition.node.type === 'VariableDeclarator'
      ) {
        let initializer = unwrap(definition.node.init);
        while (initializer?.type === 'MemberExpression') initializer = unwrap(initializer.object);
        if (initializer?.type === 'CallExpression' || initializer?.type === 'ImportExpression')
          return importedFrom(initializer);
      }
      return undefined;
    }

    function isLibrary(specifier: string) {
      // Match the same explicit paths without depending on emitted JS or pnpm's store layout.
      const target = specifier.startsWith('.')
        ? path.posix.normalize(path.posix.join(directory, specifier))
        : specifier;
      const candidates = specifier.startsWith('.')
        ? [target, `${target}.ts`, target.replace(/\.js$/, '.ts')]
        : [target, `node_modules/${target}/`];
      return libraries.some((pattern) => candidates.some((candidate) => pattern.test(candidate)));
    }

    function checkArgument(expression: ESTree.Node | null | undefined) {
      const node = unwrap(expression);
      if (!node) return;
      if (node.type === 'ObjectExpression') {
        for (const property of node.properties) {
          if (property.type === 'SpreadElement') checkArgument(property.argument);
          else if (!property.method && property.kind === 'init') checkArgument(property.value);
        }
      } else if (node.type === 'ArrayExpression') {
        for (const element of node.elements) checkArgument(element);
      } else if (node.type === 'SpreadElement') {
        checkArgument(node.argument);
      } else {
        const library = importedFrom(node);
        if (library && isLibrary(library))
          context.report({ node, messageId: 'directImport', data: { library } });
      }
    }

    return {
      NewExpression(node) {
        const constructor = importedFrom(node.callee);
        if (!constructor?.startsWith('.')) return;
        const target = path.posix.normalize(path.posix.join(directory, constructor));
        if (!target.startsWith(`${directory}/`)) return;
        for (const argument of node.arguments) checkArgument(argument);
      },
    };
  },
};
