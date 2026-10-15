import type { CreateRule } from '@oxlint/plugins';

export const noHardcodedGhostPaths: CreateRule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow hardcoded /ghost/ paths that break subdirectory installations',
    },
    messages: {
      noHardcodedPath:
        'Do not hardcode /ghost/ paths. Use getGhostPaths() from @tryghost/admin-x-framework/helpers to support subdirectory installations.',
    },
  },
  create(context) {
    const pattern = /^\/ghost\//;
    return {
      Literal(node) {
        if (typeof node.value === 'string' && pattern.test(node.value)) {
          context.report({ node, messageId: 'noHardcodedPath' });
        }
      },
      TemplateLiteral(node) {
        const first = node.quasis[0];
        if (first && pattern.test(first.value.raw)) {
          context.report({ node, messageId: 'noHardcodedPath' });
        }
      },
    };
  },
};
