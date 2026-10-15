import path from 'node:path';
import { fileURLToPath } from 'node:url';
import boundaries from '../../../../.dependency-cruiser.cjs';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
// Reuse the native boundary rule: $1 denotes internal service files, not libraries.
const boundary = boundaries.forbidden.find(({ name }) => name === 'service-dependencies');
const services = new RegExp(boundary.from.path);
const libraries = boundary.to.pathNot
  .filter((pattern) => !pattern.includes('$1'))
  .map((pattern) => new RegExp(pattern));

function unwrap(node) {
  while (
    [
      'TSAsExpression',
      'TSSatisfiesExpression',
      'TSNonNullExpression',
      'TSTypeAssertion',
      'AwaitExpression',
    ].includes(node?.type)
  ) {
    node = node.type === 'AwaitExpression' ? node.argument : node.expression;
  }
  return node;
}

export default {
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

    function variable(identifier) {
      for (let scope = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const binding = scope.set.get(identifier.name);
        if (binding) return binding;
      }
    }

    // Follow imported bindings and literal require() calls, not arbitrary value flow.
    function importedFrom(expression) {
      const node = unwrap(expression);
      if (!node) return;
      if (node.type === 'MemberExpression') return importedFrom(node.object);
      if (node.type === 'ImportExpression' && node.source.type === 'Literal')
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
        definition.parent?.importKind !== 'type' &&
        definition.node.importKind !== 'type'
      ) {
        return (
          definition.parent?.source?.value ?? definition.node.moduleReference?.expression?.value
        );
      }
      // const require bindings cannot be reassigned; aliases and mutable bags need review.
      if (definition?.type === 'Variable' && definition.parent.kind === 'const') {
        let initializer = unwrap(definition.node.init);
        while (initializer?.type === 'MemberExpression') initializer = unwrap(initializer.object);
        if (['CallExpression', 'ImportExpression'].includes(initializer?.type))
          return importedFrom(initializer);
      }
    }

    function isLibrary(specifier) {
      // Match the same explicit paths without depending on emitted JS or pnpm's store layout.
      const target = specifier.startsWith('.')
        ? path.posix.normalize(path.posix.join(directory, specifier))
        : specifier;
      const candidates = specifier.startsWith('.')
        ? [target, `${target}.ts`, target.replace(/\.js$/, '.ts')]
        : [target, `node_modules/${target}/`];
      return libraries.some((pattern) => candidates.some((candidate) => pattern.test(candidate)));
    }

    function checkArgument(expression) {
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
