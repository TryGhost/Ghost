import type { CreateRule, ESTree } from '@oxlint/plugins';

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { isServiceDefinition, readLegacyServices, servicesRoot } from '../legacy-services.ts';

const root = fileURLToPath(new URL('../../../../', import.meta.url));
// The legacy steps of the start sequence: what core/boot.js called its phases.
const bootFile = 'ghost/bootstrap/transition/boot-steps.ts';
const servicePath = /^\.\.\/\.\.\/core\/server\/services\/([^/]+?)(?:\/index)?$/;
// The services list, and the shared list, which starts a few standard roots too.
const listFiles = ['ghost/bootstrap/services.ts', 'ghost/bootstrap/shared.ts'];
const listEntry = /require\('\.\.\/core\/server\/services\/([^/']+?)(?:\/index)?'\)\.default/g;

// The roots the services list names. The framework awaits init() on each, in
// order. Read each time the steps file is linted, for the same reason as the inventory.
function readListedServices() {
  return new Set(
    listFiles
      .map((listFile) => path.join(root, listFile))
      .filter((file) => existsSync(file))
      .flatMap((file) => [...readFileSync(file, 'utf8').matchAll(listEntry)])
      .map((match) => match[1]!),
  );
}

// A service directory that the legacy service inventory does not list is standard.
// A directory with no root is not a service: switching branches can leave one
// behind holding only untracked files. This is read each time the steps file is linted,
// so an editor's long-lived lint process sees a new service or an inventory edit.
//
// A root that is a service definition is left out: boot does not start it, so
// there is no init() to await. The bootstrap unit tests check where a
// definition must be listed instead.
function readStandardServices() {
  const legacy = readLegacyServices(root);
  const directory = path.join(root, servicesRoot);
  const startedByBoot = (service: string) => {
    const file = ['index.ts', 'index.js']
      .map((name) => path.join(directory, service, name))
      .find((candidate) => existsSync(candidate));
    return file !== undefined && !isServiceDefinition(readFileSync(file, 'utf8'));
  };
  return new Set(
    readdirSync(directory, { withFileTypes: true })
      .filter((item) => item.isDirectory() && !legacy.has(item.name) && startedByBoot(item.name))
      .map((item) => item.name),
  );
}

type Phase = ESTree.Function;
type CallExpression = ESTree.CallExpression;

/**
 * Requires boot to await the init() of every service that is not a legacy
 * service and holds its own instance: either the services list names it, or a legacy step that
 * boot-steps.ts exports awaits it. It reads the list and the steps file only:
 * it cannot tell whether the order is right, which the boot tests cover, or
 * that the application definition lists each exported step, which the
 * bootstrap test covers.
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
      both: 'The services list in ghost/bootstrap/services.ts already starts {{service}}. Remove this init() from boot-steps.ts.',
      notAwaited:
        'Await {{binding}}.init() as a statement of its boot phase, on its own or inside an awaited Promise.all([...]). Boot must wait for {{service}} even when its init() is synchronous.',
      inline:
        "Bind the root, then await init() on the binding: const example = require('../../core/server/services/{{service}}').default; await example.init();",
      phase:
        'boot-steps.ts does not export {{phase}} as a step, so nothing waits for {{service}}. Export the function and add it to a step in ghost/bootstrap/app.ts.',
    },
  },
  create(context) {
    const filename = path.relative(root, context.filename).split(path.sep).join('/');
    if (filename !== bootFile) {
      return {};
    }
    const services = readStandardServices();
    const listed = readListedServices();

    // Roots bound as `const x = require('../../core/server/services/<name>').default;`
    // directly in a boot phase.
    const bindings: { name: string; service: string; phase: Phase }[] = [];
    const calls: { name: string; node: CallExpression; phase?: Phase }[] = [];
    const awaited = new Set<CallExpression>();
    const inline = new Map<string, ESTree.Node>();

    // The service a `require('../../core/server/services/<name>').default` expression loads.
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
    // A step is a function declared at the top of boot-steps.ts. The framework
    // awaits the ones the file exports, through the application definition.
    function isExported(phase: Phase) {
      return (
        phase.parent?.type === 'ExportNamedDeclaration' && phase.parent.parent?.type === 'Program'
      );
    }
    function phaseWithBody(node: ESTree.Node | null | undefined) {
      return node?.type === 'BlockStatement' &&
        node.parent?.type === 'FunctionDeclaration' &&
        (node.parent.parent?.type === 'Program' || isExported(node.parent))
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
    return {
      VariableDeclarator(node) {
        const service = rootService(node.init);
        const phase = phaseWithBody(node.parent?.parent);
        if (service !== undefined && phase && node.id.type === 'Identifier') {
          bindings.push({ name: node.id.name, service, phase });
        }
      },
      CallExpression(node) {
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
            // Started by the framework. A second start in a legacy step would hide which one is real.
            for (const node of [...inits.map((call) => call.node), inline.get(service)]) {
              if (node) {
                context.report({ node, messageId: 'both', data: { service } });
              }
            }
            continue;
          }
          if (ready) {
            const phase = ready.phase?.id?.name;
            if (ready.phase && phase !== undefined && !isExported(ready.phase)) {
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
