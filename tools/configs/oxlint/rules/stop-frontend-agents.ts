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
    // Each start, and the start each local name refers to at this point in the file.
    const starts: ESTree.Node[] = [];
    const current = new Map<string, ESTree.Node>();
    // Result variables, pointing at the start they hold.
    const results = new Map<string, ESTree.Node>();
    const stopped = new Set<ESTree.Node>();
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
      if (!starts.includes(call)) starts.push(call);
      return call;
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
      const start = sourceOf(value);
      if (!start) return;
      if (target.type === 'Identifier') {
        current.set(target.name, start);
        if (startOf(value) || value?.type === 'Identifier') results.set(target.name, start);
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
          current.set(property.value.name, start);
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
        let local: string | undefined;
        if (receiver.type === 'Identifier') local = receiver.name;
        else if (
          receiver.type === 'MemberExpression' &&
          receiver.object.type === 'Identifier' &&
          receiver.property.type === 'Identifier' &&
          receiver.property.name === 'ghostServer'
        ) {
          local = receiver.object.name;
        }
        const start = local === undefined ? undefined : current.get(local);
        if (start) stopped.add(start);
      },
      'Program:exit'() {
        if (stopsGhost) return;
        for (const node of starts) {
          if (!stopped.has(node)) context.report({ node, messageId: 'running' });
        }
      },
    };
  },
};
