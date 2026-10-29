import type { CreateRule, ESTree, Scope, Variable } from '@oxlint/plugins';

/** Enforces the public source shape of migrated service roots. */
export const serviceRootShape: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Keep migrated service roots limited to init, service and declared extras',
    },
    schema: [
      {
        type: 'object',
        properties: { helperImport: { type: 'string' } },
        required: ['helperImport'],
        additionalProperties: false,
      },
    ],
    messages: {
      runtimeExport: 'Named runtime exports belong in extras; type-only exports are allowed.',
      defaultExport: 'Export a default initializer created by the kernel defineService helper.',
      alias: 'Initializer and extras aliases must resolve to local const declarations.',
      arguments: 'Use defineService(name, create, extras?).',
      explicitExtras: 'Extras must be an explicit object so every member can be catalogued.',
      property: 'List extras explicitly with static names; no spreads or accessors.',
      duplicate: 'List each extra once.',
      value: 'Pass helper references instead of invoking or constructing extras on import.',
      mutation:
        'Do not add, override or remove initializer properties, extras or CommonJS exports.',
      escape:
        'Do not pass the initializer or extras to another function; declare helpers through extras.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const option = context.options[0];
    const helperImport =
      option && typeof option === 'object' && !Array.isArray(option)
        ? option.helperImport
        : undefined;
    const factories = new Set<Variable | undefined>();
    const constants = new Map<Variable | undefined, ESTree.Node>();
    const aliases: [Variable | undefined, ESTree.Node][] = [];
    const managed = new Set<Variable | undefined>();
    const calls: ESTree.CallExpression[] = [];
    const mutations: { node: ESTree.Node; target: ESTree.Node }[] = [];
    let defaultExport: ESTree.ExportDefaultDeclaration | undefined;

    function variable(
      identifier: Extract<ESTree.Node, { type: 'Identifier' }>,
    ): Variable | undefined {
      for (let scope: Scope | null = sourceCode.getScope(identifier); scope; scope = scope.upper) {
        const found = scope.set.get(identifier.name);
        if (found) {
          return found;
        }
      }
      return undefined;
    }
    function unwrap(node: ESTree.Node) {
      while (
        node.type === 'TSAsExpression' ||
        node.type === 'TSTypeAssertion' ||
        node.type === 'TSNonNullExpression' ||
        node.type === 'TSSatisfiesExpression' ||
        node.type === 'ChainExpression'
      ) {
        node = node.expression;
      }
      return node;
    }
    function report(node: ESTree.Node, messageId: string) {
      context.report({ node, messageId });
    }
    function resolve(
      node: ESTree.Node,
      bindings: Set<Variable | undefined>,
      seen = new Set<Variable | undefined>(),
    ): ESTree.Node | undefined {
      node = unwrap(node);
      if (node.type !== 'Identifier') {
        return node;
      }
      const binding = variable(node);
      const value = constants.get(binding);
      if (!value || seen.has(binding)) {
        report(node, 'alias');
        return;
      }
      seen.add(binding);
      bindings.add(binding);
      return resolve(value, bindings, seen);
    }
    function propertyName(node: ESTree.Node) {
      if (node.type !== 'MemberExpression') {
        return;
      }
      if (!node.computed && node.property.type === 'Identifier') {
        return node.property.name;
      }
      if (node.computed && node.property.type === 'Literal') {
        return node.property.value;
      }
      return undefined;
    }
    function referencesManaged(node: ESTree.Node): boolean {
      node = unwrap(node);
      if (node.type === 'Identifier') {
        const binding = variable(node);
        return (
          managed.has(binding) ||
          (node.name === 'exports' && (!binding || binding.defs.length === 0))
        );
      }
      if (
        node.type === 'MemberExpression' &&
        propertyName(node) === 'extras' &&
        referencesManaged(node.object)
      ) {
        return true;
      }
      return (
        node.type === 'MemberExpression' &&
        propertyName(node) === 'exports' &&
        node.object.type === 'Identifier' &&
        node.object.name === 'module' &&
        (!variable(node.object) || variable(node.object)?.defs.length === 0)
      );
    }
    function managedMember(node: ESTree.Node) {
      node = unwrap(node);
      return (
        referencesManaged(node) ||
        (node.type === 'MemberExpression' && referencesManaged(node.object))
      );
    }
    function inspectExtras(object: ESTree.Node) {
      if (object.type !== 'ObjectExpression') {
        report(object, 'explicitExtras');
        return;
      }
      const names = new Set<string>();
      for (const property of object.properties) {
        if (
          property.type !== 'Property' ||
          property.computed ||
          property.kind !== 'init' ||
          (property.key.type !== 'Identifier' && property.key.type !== 'Literal') ||
          (property.key.type === 'Literal' && typeof property.key.value !== 'string')
        ) {
          report(property, 'property');
          continue;
        }
        const name = property.key.type === 'Identifier' ? property.key.name : property.key.value;
        if (names.has(name)) {
          report(property, 'duplicate');
        }
        names.add(name);
        const value = unwrap(property.value);
        if (
          !['Identifier', 'ArrowFunctionExpression', 'FunctionExpression', 'Literal'].includes(
            value.type,
          )
        ) {
          report(property.value, 'value');
        }
      }
    }

    return {
      ImportDeclaration(node) {
        if (node.source.value === helperImport && node.importKind !== 'type') {
          for (const specifier of node.specifiers) {
            if (
              specifier.type === 'ImportSpecifier' &&
              specifier.importKind !== 'type' &&
              specifier.imported.type === 'Identifier' &&
              specifier.imported.name === 'defineService'
            ) {
              factories.add(variable(specifier.local));
            }
          }
        }
      },
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && node.init) {
          const binding = variable(node.id);
          aliases.push([binding, node.init]);
          if (node.parent.type === 'VariableDeclaration' && node.parent.kind === 'const') {
            constants.set(binding, node.init);
          }
        }
      },
      ExportDefaultDeclaration(node) {
        defaultExport = node;
      },
      ExportNamedDeclaration(node) {
        if (
          node.exportKind !== 'type' &&
          (node.declaration || node.specifiers.some((specifier) => specifier.exportKind !== 'type'))
        ) {
          report(node, 'runtimeExport');
        }
      },
      ExportAllDeclaration(node) {
        if (node.exportKind !== 'type') {
          report(node, 'runtimeExport');
        }
      },
      TSExportAssignment(node) {
        report(node, 'runtimeExport');
      },
      CallExpression(node) {
        calls.push(node);
      },
      AssignmentExpression(node) {
        if (node.operator === '=' && node.left.type === 'Identifier') {
          aliases.push([variable(node.left), node.right]);
        }
        mutations.push({ node, target: node.left });
      },
      UpdateExpression(node) {
        mutations.push({ node, target: node.argument });
      },
      UnaryExpression(node) {
        if (node.operator === 'delete') {
          mutations.push({ node, target: node.argument });
        }
      },
      'Program:exit'(program) {
        if (!defaultExport) {
          report(program, 'defaultExport');
          return;
        }
        const initializer = resolve(defaultExport.declaration, managed);
        if (!initializer) {
          return;
        }
        if (
          initializer.type !== 'CallExpression' ||
          initializer.callee.type !== 'Identifier' ||
          !factories.has(variable(initializer.callee))
        ) {
          report(defaultExport, 'defaultExport');
          return;
        }
        if (
          ![2, 3].includes(initializer.arguments.length) ||
          initializer.arguments.some((argument) => argument.type === 'SpreadElement')
        ) {
          report(initializer, 'arguments');
          return;
        }
        if (initializer.arguments[2]) {
          const extras = resolve(initializer.arguments[2], managed);
          if (extras) {
            inspectExtras(extras);
          }
        }
        // Follow aliases in every lexical scope using bindings, not identifier spellings.
        let changed = true;
        while (changed) {
          changed = false;
          for (const [binding, value] of aliases) {
            if (!managed.has(binding) && referencesManaged(value)) {
              managed.add(binding);
              changed = true;
            }
          }
        }
        for (const call of calls) {
          if (call !== initializer && call.arguments.some(referencesManaged)) {
            report(call, 'escape');
          }
        }
        for (const { node, target } of mutations) {
          if (
            managedMember(target) &&
            !(
              node.type === 'AssignmentExpression' &&
              target.type === 'Identifier' &&
              node.operator === '=' &&
              referencesManaged(node.right)
            )
          ) {
            report(node, 'mutation');
          }
        }
      },
    };
  },
};
