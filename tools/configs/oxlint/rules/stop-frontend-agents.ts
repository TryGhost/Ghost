import type { CreateRule, ESTree } from '@oxlint/plugins';

// getAgentsWithFrontend boots Ghost with a real listener, and e2e workers are
// shared between files, so a server left running breaks the next file to start one.
export const stopFrontendAgents: CreateRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Stop the Ghost server that getAgentsWithFrontend starts' },
    schema: [],
    messages: {
      running: 'getAgentsWithFrontend starts a real server. Stop it with ghostServer.stop().',
    },
  },
  create(context) {
    // Each start, with the local names that refer to its result or server.
    const starts = new Map<ESTree.Node, Set<string>>();
    // Result variables, pointing at the names of the start they hold.
    const results = new Map<string, Set<string>>();
    const stopped = new Set<string>();
    let stopsGhost = false;

    const nameOf = (node: ESTree.Node) =>
      node.type === 'Identifier'
        ? node.name
        : node.type === 'MemberExpression' && node.property.type === 'Identifier'
          ? node.property.name
          : undefined;
    const startOf = (node: ESTree.Node | null | undefined) => {
      const call = node?.type === 'AwaitExpression' ? node.argument : node;
      if (call?.type !== 'CallExpression' || nameOf(call.callee) !== 'getAgentsWithFrontend') {
        return;
      }
      let names = starts.get(call);
      if (!names) starts.set(call, (names = new Set()));
      return names;
    };
    // The start a value comes from: the call itself, a result variable, or result.ghostServer.
    const sourceOf = (node: ESTree.Node | null | undefined) => {
      if (node?.type === 'Identifier') return results.get(node.name);
      if (
        node?.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.property.type === 'Identifier' &&
        node.property.name === 'ghostServer'
      ) {
        return results.get(node.object.name);
      }
      return startOf(node);
    };
    const bind = (target: ESTree.Node, value: ESTree.Node | null | undefined) => {
      const names = sourceOf(value);
      if (!names) return;
      if (target.type === 'Identifier') {
        names.add(target.name);
        if (startOf(value) || value?.type === 'Identifier') results.set(target.name, names);
        return;
      }
      if (target.type !== 'ObjectPattern') return;
      for (const property of target.properties) {
        if (
          property.type === 'Property' &&
          property.key.type === 'Identifier' &&
          property.key.name === 'ghostServer' &&
          property.value.type === 'Identifier'
        ) {
          names.add(property.value.name);
        }
      }
    };

    return {
      VariableDeclarator(node) {
        bind(node.id, node.init);
      },
      AssignmentExpression(node) {
        bind(node.left, node.right);
      },
      CallExpression(node) {
        const { callee } = node;
        const name = nameOf(callee);
        startOf(node);
        if (name === 'stopGhost') stopsGhost = true;
        if (callee.type !== 'MemberExpression' || name !== 'stop') return;
        // server.stop() or result.ghostServer.stop(); other stop() calls don't count.
        const receiver = callee.object;
        if (receiver.type === 'Identifier') stopped.add(receiver.name);
        else if (
          receiver.type === 'MemberExpression' &&
          receiver.object.type === 'Identifier' &&
          receiver.property.type === 'Identifier' &&
          receiver.property.name === 'ghostServer'
        ) {
          stopped.add(receiver.object.name);
        }
      },
      'Program:exit'() {
        if (stopsGhost) return;
        for (const [node, names] of starts) {
          if (![...names].some((name) => stopped.has(name))) {
            context.report({ node, messageId: 'running' });
          }
        }
      },
    };
  },
};
