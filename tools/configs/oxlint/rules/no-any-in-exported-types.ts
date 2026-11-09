import type { CreateRule } from '@oxlint/plugins';

// An exported type is what callers and fakes are checked against, so `any` there
// switches off the check for everyone who imports it.
export const noAnyInExportedTypes: CreateRule = {
  meta: {
    type: 'problem',
    docs: { description: 'Keep any out of the types a service exports' },
    schema: [],
    messages: {
      any: 'Exported types are the contract other code is checked against. Replace any with the real or narrowest useful type.',
    },
  },
  create(context) {
    let exported = 0;
    const isType = (type?: string) =>
      type === 'TSTypeAliasDeclaration' || type === 'TSInterfaceDeclaration';

    return {
      ExportNamedDeclaration(node) {
        if (isType(node.declaration?.type)) exported += 1;
      },
      'ExportNamedDeclaration:exit'(node) {
        if (isType(node.declaration?.type)) exported -= 1;
      },
      TSAnyKeyword(node) {
        if (exported > 0) context.report({ node, messageId: 'any' });
      },
    };
  },
};
