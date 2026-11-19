import type { CreateRule, ESTree } from '@oxlint/plugins';

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readLegacyServices, servicesRoot } from '../legacy-services.ts';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
const bootFile = 'ghost/core/boot.js';
const servicePath = /^\.\/server\/services\/([^/]+?)(?:\/index)?$/;
const listFile = 'ghost/bootstrap/services.ts';
const listEntry = /require\('\.\.\/core\/server\/services\/([^/']+?)(?:\/index)?'\)\.default/g;

// The roots the services list names. The framework awaits init() on each, in
// order. Read each time boot.js is linted, for the same reason as the inventory.
function readListedServices() {
  const file = path.join(root, listFile);
  if (!existsSync(file)) {
    return new Set<string>();
  }
  return new Set([...readFileSync(file, 'utf8').matchAll(listEntry)].map((match) => match[1]!));
}

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
 * service, in a phase that boot.js exports as a step. It reads boot.js only: it
 * cannot tell whether the order is right, which the boot tests cover, or that
 * the application definition lists each exported step, which the bootstrap
 * test covers.
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
        "Nothing starts {{service}}. Add it to the services list in ghost/bootstrap/services.ts, after what it reads while it starts: { name: '{{service}}', load: () => require('../core/server/services/{{service}}').default },",
      both: 'The services list in ghost/bootstrap/services.ts already starts {{service}}. Remove this init() from boot.js.',
      notAwaited:
        'Await {{binding}}.init() as a statement of its boot phase, on its own or inside an awaited Promise.all([...]). Boot must wait for {{service}} even when its init() is synchronous.',
      inline:
        "Bind the root, then await init() on the binding: const example = require('./server/services/{{service}}').default; await example.init();",
      phase:
        'boot.js does not export {{phase}} as a step, so nothing waits for {{service}}. Add it to the Object.assign(module.exports, {...}) list and to a step in ghost/bootstrap/app.ts.',
    },
  },
  create(context) {
    const filename = path.relative(root, context.filename).split(path.sep).join('/');
    if (filename !== bootFile) {
      return {};
    }
    const services = readStandardServices();
    const listed = readListedServices();

    // Roots bound as `const x = require('./server/services/<name>').default;`
    // directly in a boot phase.
    const bindings: { name: string; service: string; phase: Phase }[] = [];
    const calls: { name: string; node: CallExpression; phase?: Phase }[] = [];
    const awaited = new Set<CallExpression>();
    const inline = new Map<string, ESTree.Node>();
    const exportedPhases = new Set<string>();

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
    // `Object.assign(module.exports, { phase, ... })` at the top of boot.js: the
    // steps the application definition lists. The framework awaits each one.
    function exportedSteps(call: CallExpression) {
      const [target, steps] = call.arguments;
      if (
        call.parent?.type !== 'ExpressionStatement' ||
        call.parent.parent?.type !== 'Program' ||
        call.callee.type !== 'MemberExpression' ||
        call.callee.computed ||
        call.callee.object.type !== 'Identifier' ||
        call.callee.object.name !== 'Object' ||
        call.callee.property.type !== 'Identifier' ||
        call.callee.property.name !== 'assign' ||
        target?.type !== 'MemberExpression' ||
        target.computed ||
        target.object.type !== 'Identifier' ||
        target.object.name !== 'module' ||
        target.property.type !== 'Identifier' ||
        target.property.name !== 'exports' ||
        steps?.type !== 'ObjectExpression'
      ) {
        return [];
      }
      return steps.properties.flatMap((property) =>
        property.type === 'Property' &&
        !property.computed &&
        property.key.type === 'Identifier' &&
        property.value.type === 'Identifier' &&
        property.value.name === property.key.name
          ? [property.key.name]
          : [],
      );
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
        for (const step of exportedSteps(node)) {
          exportedPhases.add(step);
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
          if (listed.has(service)) {
            // Started by the framework. A second start in boot.js would hide which one is real.
            for (const node of [...inits.map((call) => call.node), inline.get(service)]) {
              if (node) {
                context.report({ node, messageId: 'both', data: { service } });
              }
            }
            continue;
          }
          if (ready) {
            const phase = ready.phase?.id?.name;
            if (phase !== undefined && !exportedPhases.has(phase)) {
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
