import type { CreateRule, ESTree } from '@oxlint/plugins';

// Modules that read the machine or hold one process-wide instance. Importing
// one for its value makes a kernel file depend on where and when it runs.
const ambientModules =
  /^(?:node:)?(?:fs|fs\/promises|child_process|os|module|worker_threads|cluster|net|http|https|dns)$|^(?:nconf|moment|moment-timezone)$|^@tryghost\/(?:logging|metrics|domain-events|debug|root-utils|version)$/;

type Node = ESTree.Node;

const isIdentifier = (node: Node | null | undefined, name: string) =>
  node?.type === 'Identifier' && node.name === name;

// `a.b` where a and b are plain names.
function member(node: Node | null | undefined, object: string, property: string) {
  return (
    node?.type === 'MemberExpression' &&
    !node.computed &&
    isIdentifier(node.object, object) &&
    isIdentifier(node.property, property)
  );
}

// The name a call chain starts from: `z` in `z.object({}).strict()`.
function chainRoot(node: Node): string | undefined {
  let current: Node = node;
  for (;;) {
    if (current.type === 'CallExpression') {
      current = current.callee;
    } else if (current.type === 'MemberExpression') {
      current = current.object;
    } else {
      return current.type === 'Identifier' ? current.name : undefined;
    }
  }
}

// What a module-scope `const` may hold: something that describes or computes,
// never something that remembers.
function whyNotAMechanism(init: Node | null | undefined): string | undefined {
  if (!init) return 'has no value';
  switch (init.type) {
    case 'Literal':
      // A regular expression with the g or y flag keeps its position between calls.
      return 'regex' in init && init.regex && /[gy]/.test(init.regex.flags)
        ? 'is a regular expression that keeps state between calls (g or y flag)'
        : undefined;
    case 'TemplateLiteral':
    case 'ArrowFunctionExpression':
    case 'FunctionExpression':
    case 'ClassExpression':
      return undefined;
    case 'TSAsExpression':
    case 'TSSatisfiesExpression':
      if (
        init.type === 'TSAsExpression' &&
        init.typeAnnotation.type === 'TSTypeReference' &&
        isIdentifier(init.typeAnnotation.typeName, 'const')
      ) {
        return undefined;
      }
      return whyNotAMechanism(init.expression);
    case 'ArrayExpression':
    case 'ObjectExpression':
      return 'is an object or array that can be changed; add `as const` or Object.freeze()';
    case 'NewExpression':
      return 'is an instance built when the file is imported';
    case 'CallExpression': {
      if (isIdentifier(init.callee, 'Symbol') || member(init.callee, 'Symbol', 'for')) {
        return undefined;
      }
      if (member(init.callee, 'Object', 'freeze')) return undefined;
      // A Zod schema describes a shape and is immutable.
      if (chainRoot(init) === 'z') return undefined;
      return 'is the result of a call made when the file is imported';
    }
    default:
      return 'is not a function, class, constant or schema';
  }
}

// The kernel holds what any code may import without thinking: nothing in it
// may remember anything or read where it is running.
export const kernelPurity: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Kernel files hold no module-level state, read nothing ambient and export no instances',
    },
    schema: [],
    messages: {
      state:
        'Kernel modules hold no state: `{{name}}` {{why}}. Keep state inside what a factory returns.',
      effect:
        'Kernel modules do nothing when imported. Move this into a function the application calls.',
      instance:
        'Kernel exports are mechanisms (functions, classes, types, schemas), never instances: `{{name}}` {{why}}.',
      ambientImport:
        'Kernel code reads nothing ambient: `{{source}}` reads the machine or holds a process-wide instance. Take what it provides as an argument, and import only its types.',
      ambientRead:
        'Kernel code reads nothing ambient: {{what}}. Take the value as an argument from the application.',
    },
  },
  create(context) {
    const reportVariable = (
      declaration: Extract<Node, { type: 'VariableDeclaration' }>,
      exported: boolean,
    ) => {
      for (const declarator of declaration.declarations) {
        const name = context.sourceCode.getText(declarator.id);
        if (declaration.kind !== 'const') {
          context.report({
            node: declarator,
            messageId: 'state',
            data: { name, why: `is declared with ${declaration.kind} and can be reassigned` },
          });
          continue;
        }
        // An exported alias of something imported re-exports a value lint cannot see into.
        if (exported && declarator.init?.type === 'Identifier') {
          context.report({
            node: declarator,
            messageId: 'instance',
            data: { name, why: `re-exports the value \`${declarator.init.name}\`` },
          });
          continue;
        }
        if (declarator.init?.type === 'Identifier') continue;
        const why = whyNotAMechanism(declarator.init);
        if (why) {
          context.report({
            node: declarator,
            messageId: exported ? 'instance' : 'state',
            data: { name, why },
          });
        }
      }
    };

    return {
      Program(program) {
        for (const statement of program.body) {
          if (statement.type === 'VariableDeclaration') {
            reportVariable(statement, false);
          } else if (
            statement.type === 'ExportNamedDeclaration' &&
            statement.declaration?.type === 'VariableDeclaration'
          ) {
            reportVariable(statement.declaration, true);
          } else if (statement.type === 'ExportDefaultDeclaration') {
            const { declaration } = statement;
            if (declaration.type === 'NewExpression' || declaration.type === 'CallExpression') {
              const why = whyNotAMechanism(declaration);
              if (why) {
                context.report({
                  node: statement,
                  messageId: 'instance',
                  data: { name: 'default', why },
                });
              }
            }
          } else if (
            statement.type === 'ExpressionStatement' &&
            // Directives such as 'use strict' are not effects.
            !('directive' in statement && statement.directive)
          ) {
            context.report({ node: statement, messageId: 'effect' });
          }
        }
      },
      // A static field is module-level state under another name.
      PropertyDefinition(node) {
        if (!node.static || !node.value) return;
        const why = whyNotAMechanism(node.value);
        if (why) {
          context.report({
            node,
            messageId: 'state',
            data: { name: context.sourceCode.getText(node.key), why },
          });
        }
      },
      ImportDeclaration(node) {
        const source = String(node.source.value);
        if (!ambientModules.test(source) || node.importKind === 'type') return;
        const valueImports = node.specifiers.filter(
          (specifier) => !(specifier.type === 'ImportSpecifier' && specifier.importKind === 'type'),
        );
        if (valueImports.length || node.specifiers.length === 0) {
          context.report({ node, messageId: 'ambientImport', data: { source } });
        }
      },
      CallExpression(node) {
        if (isIdentifier(node.callee, 'require')) {
          const [argument] = node.arguments;
          if (argument?.type === 'Literal' && typeof argument.value === 'string') {
            if (ambientModules.test(argument.value)) {
              context.report({
                node,
                messageId: 'ambientImport',
                data: { source: argument.value },
              });
            }
          } else {
            context.report({
              node,
              messageId: 'ambientRead',
              data: { what: 'a computed require() loads whatever is on disk' },
            });
          }
          return;
        }
        if (member(node.callee, 'Date', 'now')) {
          context.report({
            node,
            messageId: 'ambientRead',
            data: { what: 'Date.now() reads the clock' },
          });
        } else if (member(node.callee, 'Math', 'random')) {
          context.report({
            node,
            messageId: 'ambientRead',
            data: { what: 'Math.random() is different on every call' },
          });
        } else if (member(node.callee, 'performance', 'now')) {
          context.report({
            node,
            messageId: 'ambientRead',
            data: { what: 'performance.now() reads the clock' },
          });
        }
      },
      NewExpression(node) {
        if (isIdentifier(node.callee, 'Date') && node.arguments.length === 0) {
          context.report({
            node,
            messageId: 'ambientRead',
            data: { what: 'new Date() reads the clock' },
          });
        }
      },
      MemberExpression(node) {
        if (!isIdentifier(node.object, 'process') || node.computed) return;
        if (node.property.type !== 'Identifier') return;
        if (['env', 'argv', 'cwd', 'platform', 'pid', 'execPath'].includes(node.property.name)) {
          context.report({
            node,
            messageId: 'ambientRead',
            data: { what: `process.${node.property.name} reads the process` },
          });
        }
      },
    };
  },
};
