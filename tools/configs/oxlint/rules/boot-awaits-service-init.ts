import type { CreateRule, ESTree } from '@oxlint/plugins';

import { existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLegacyServices, servicesRoot } from '../legacy-services.ts';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const bootFile = 'ghost/core/boot.js';
const entry = 'bootGhost';
const servicePath = /^\.\/server\/services\/([^/]+?)(?:\/index)?$/;

// A service directory that the legacy service inventory does not list is standard.
// A directory with no root is not a service: switching branches can leave one
// behind holding only untracked files. This is read each time boot.js is linted,
// so an editor's long-lived lint process sees a new service or an inventory edit.
function readStandardServices() {
  const legacy = readLegacyServices(root);
  const directory = path.join(root, servicesRoot);
  return new Set(
    readdirSync(directory, { withFileTypes: true })
      .filter(
        (item) =>
          item.isDirectory() &&
          !legacy.has(item.name) &&
          ['index.ts', 'index.js'].some((file) =>
            existsSync(path.join(directory, item.name, file)),
          ),
      )
      .map((item) => item.name),
  );
}

type Phase = ESTree.Function;
type CallExpression = ESTree.CallExpression;

/**
 * Requires boot to await the init() of every service that is not a legacy
 * service. It reads boot.js only: it cannot tell whether the order is right,
 * which the boot tests cover.
 */
export const bootAwaitsServiceInit: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Await the init() of every standard service in a boot phase',
    },
    schema: [],
    messages: {
      missing:
        "Boot never initializes {{service}}. In the right boot phase, add: const example = require('./server/services/{{service}}').default; await example.init();",
      notAwaited:
        'Await {{binding}}.init() as a statement of its boot phase, on its own or inside an awaited Promise.all([...]). Boot must wait for {{service}} even when its init() is synchronous.',
      inline:
        "Bind the root, then await init() on the binding: const example = require('./server/services/{{service}}').default; await example.init();",
      phase: `${entry} does not await {{phase}}, so nothing waits for {{service}}.`,
    },
  },
  create(context) {
    const filename = path.relative(root, context.filename).split(path.sep).join('/');
    if (filename !== bootFile) {
      return {};
    }
    const services = readStandardServices();

    // Roots bound as `const x = require('./server/services/<name>').default;`
    // directly in a boot phase.
    const bindings: { name: string; service: string; phase: Phase }[] = [];
    const calls: { name: string; node: CallExpression; phase?: Phase }[] = [];
    const awaited = new Set<CallExpression>();
    const inline = new Map<string, ESTree.Node>();
    const awaitedPhases = new Set<string>();

    // The service a `require('./server/services/<name>').default` expression loads.
    function rootService(node: ESTree.Node | null | undefined) {
      if (
        node?.type !== 'MemberExpression' ||
        node.computed ||
        node.property.type !== 'Identifier' ||
        node.property.name !== 'default' ||
        node.object.type !== 'CallExpression' ||
        node.object.callee.type !== 'Identifier' ||
        node.object.callee.name !== 'require'
      ) {
        return undefined;
      }
      const [argument] = node.object.arguments;
      const service =
        argument?.type === 'Literal' && typeof argument.value === 'string'
          ? servicePath.exec(argument.value)?.[1]
          : undefined;
      return service !== undefined && services.has(service) ? service : undefined;
    }
    // A boot phase is a function declared at the top of boot.js.
    function phaseWithBody(node: ESTree.Node | null | undefined) {
      return node?.type === 'BlockStatement' &&
        node.parent?.type === 'FunctionDeclaration' &&
        node.parent.parent?.type === 'Program'
        ? node.parent
        : undefined;
    }
    // `await <node>;` written as a statement of a phase, not inside a branch or callback.
    function awaitedIn(node: ESTree.Node) {
      const statement = node.parent?.type === 'AwaitExpression' ? node.parent.parent : undefined;
      return statement?.type === 'ExpressionStatement'
        ? phaseWithBody(statement.parent)
        : undefined;
    }
    function isPromiseAll(node: ESTree.Node | null | undefined): node is CallExpression {
      return (
        node?.type === 'CallExpression' &&
        node.callee.type === 'MemberExpression' &&
        !node.callee.computed &&
        node.callee.object.type === 'Identifier' &&
        node.callee.object.name === 'Promise' &&
        node.callee.property.type === 'Identifier' &&
        node.callee.property.name === 'all'
      );
    }
    function initPhase(call: CallExpression) {
      const list = call.parent;
      if (
        list?.type === 'ArrayExpression' &&
        isPromiseAll(list.parent) &&
        list.parent.arguments[0] === list
      ) {
        return awaitedIn(list.parent);
      }
      return awaitedIn(call);
    }
    // `await phase(...)` in the entry function, outside any branch or callback.
    function awaitedByEntry(call: CallExpression) {
      if (call.parent?.type !== 'AwaitExpression') {
        return false;
      }
      for (
        let node: ESTree.Node | null | undefined = call.parent.parent;
        node;
        node = node.parent
      ) {
        if (node.type === 'FunctionDeclaration') {
          return node.id?.name === entry && node.parent?.type === 'Program';
        }
        if (
          ![
            'ExpressionStatement',
            'VariableDeclarator',
            'VariableDeclaration',
            'BlockStatement',
            'TryStatement',
          ].includes(node.type)
        ) {
          return false;
        }
      }
      return false;
    }

    return {
      VariableDeclarator(node) {
        const service = rootService(node.init);
        const phase = phaseWithBody(node.parent?.parent);
        if (service !== undefined && phase && node.id.type === 'Identifier') {
          bindings.push({ name: node.id.name, service, phase });
        }
      },
      CallExpression(node) {
        if (node.callee.type === 'Identifier') {
          if (awaitedByEntry(node)) {
            awaitedPhases.add(node.callee.name);
          }
          return;
        }
        if (
          node.callee.type !== 'MemberExpression' ||
          node.callee.computed ||
          node.callee.property.type !== 'Identifier' ||
          node.callee.property.name !== 'init'
        ) {
          return;
        }
        const service = rootService(node.callee.object);
        if (service !== undefined) {
          inline.set(service, node);
        } else if (node.callee.object.type === 'Identifier') {
          const phase = initPhase(node);
          if (phase) {
            awaited.add(node);
          }
          calls.push({ name: node.callee.object.name, node, phase });
        }
      },
      'Program:exit'(program) {
        for (const service of [...services].sort()) {
          const bound = bindings.filter((binding) => binding.service === service);
          // An init() call belongs to a binding when it uses its name in the same phase,
          // or in a branch or callback, where the phase is unknown.
          const inits = calls.filter(({ name, phase }) =>
            bound.some((binding) => binding.name === name && (!phase || phase === binding.phase)),
          );
          const ready = inits.find(({ node }) => awaited.has(node));
          if (ready) {
            const phase = ready.phase?.id?.name;
            if (phase !== undefined && !awaitedPhases.has(phase)) {
              context.report({ node: ready.node, messageId: 'phase', data: { phase, service } });
            }
            continue;
          }
          const written = inline.get(service);
          if (written) {
            context.report({ node: written, messageId: 'inline', data: { service } });
          } else if (inits.length) {
            for (const { name, node } of inits) {
              context.report({ node, messageId: 'notAwaited', data: { binding: name, service } });
            }
          } else {
            context.report({ node: program, messageId: 'missing', data: { service } });
          }
        }
      },
    };
  },
};
