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
    let stops = false;

    return {
      CallExpression(node) {
        const { callee } = node;
        const name =
          callee.type === 'Identifier'
            ? callee.name
            : callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
              ? callee.property.name
              : undefined;
        if (name === 'getAgentsWithFrontend') {
          starts.push(node);
        }
        stops ||= name === 'stop' || name === 'stopGhost';
      },
      'Program:exit'() {
        if (!stops) {
          for (const node of starts) {
            context.report({ node, messageId: 'running' });
          }
        }
      },
    };
  },
};
