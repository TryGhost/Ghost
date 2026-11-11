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
    // Local names for the returned ghostServer, including destructured renames.
    const servers = new Set(['ghostServer']);
    const receivers: string[] = [];
    let stopsGhost = false;

    const nameOf = (node: ESTree.Node) =>
      node.type === 'Identifier'
        ? node.name
        : node.type === 'MemberExpression' && node.property.type === 'Identifier'
          ? node.property.name
          : undefined;

    return {
      ObjectPattern(node) {
        for (const property of node.properties) {
          if (
            property.type === 'Property' &&
            property.key.type === 'Identifier' &&
            property.key.name === 'ghostServer' &&
            property.value.type === 'Identifier'
          ) {
            servers.add(property.value.name);
          }
        }
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
