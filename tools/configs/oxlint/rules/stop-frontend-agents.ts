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
    const starts: ESTree.Node[] = [];
    // Local names for the returned ghostServer, including renames when destructured.
    const servers = new Set(['ghostServer']);
    const receivers: string[] = [];
    let stopsGhost = false;

    const nameOf = (node: ESTree.Node) =>
      node.type === 'Identifier'
        ? node.name
        : node.type === 'MemberExpression' && node.property.type === 'Identifier'
          ? node.property.name
          : undefined;

    // Variables holding the getAgentsWithFrontend() result.
    const results = new Set<string>();
    const isCall = (node: ESTree.Node | null | undefined) => {
      const call = node?.type === 'AwaitExpression' ? node.argument : node;
      return call?.type === 'CallExpression' && nameOf(call.callee) === 'getAgentsWithFrontend';
    };
    // Only aliases destructured from that result, directly or through a variable, name its server.
    const startsServer = (node: ESTree.Node | null | undefined) =>
      isCall(node) || (node?.type === 'Identifier' && results.has(node.name));
    const aliases = (pattern: Extract<ESTree.Node, { type: 'ObjectPattern' }>) => {
      for (const property of pattern.properties) {
        if (
          property.type === 'Property' &&
          property.key.type === 'Identifier' &&
          property.key.name === 'ghostServer' &&
          property.value.type === 'Identifier'
        ) {
          servers.add(property.value.name);
        }
      }
    };

    return {
      VariableDeclarator(node) {
        if (node.id.type === 'Identifier' && isCall(node.init)) results.add(node.id.name);
        if (node.id.type === 'ObjectPattern' && startsServer(node.init)) aliases(node.id);
      },
      AssignmentExpression(node) {
        if (node.left.type === 'Identifier' && isCall(node.right)) results.add(node.left.name);
        if (node.left.type === 'ObjectPattern' && startsServer(node.right)) aliases(node.left);
      },
      CallExpression(node) {
        const { callee } = node;
        const name = nameOf(callee);
        if (name === 'getAgentsWithFrontend') starts.push(node);
        if (name === 'stopGhost') stopsGhost = true;
        if (callee.type === 'MemberExpression' && name === 'stop') {
          // ghostServer.stop() or agents.ghostServer.stop(); other stop() calls don't count.
          const receiver = nameOf(callee.object);
          if (receiver) receivers.push(receiver);
        }
      },
      'Program:exit'() {
        if (stopsGhost || receivers.some((receiver) => servers.has(receiver))) return;
        for (const node of starts) {
          context.report({ node, messageId: 'running' });
        }
      },
    };
  },
};
