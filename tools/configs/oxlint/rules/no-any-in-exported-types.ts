import type { CreateRule, ESTree } from '@oxlint/plugins';

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
    // Types declared locally and exported later with `export type { Name }`.
    // Export specifiers can only name module-level types, so nested ones are skipped.
    const declaring: (string | undefined)[] = [];
    const topLevel = (node: ESTree.Node) => node.parent?.type === 'Program';
    const pending: { node: ESTree.Node; type: string }[] = [];
    const exportedNames = new Set<string>();
    const isType = (type?: string) =>
      type === 'TSTypeAliasDeclaration' || type === 'TSInterfaceDeclaration';

    return {
      ExportNamedDeclaration(node) {
        if (isType(node.declaration?.type)) exported += 1;
        if (node.source) return;
        for (const specifier of node.specifiers) {
          if (specifier.local.type === 'Identifier') exportedNames.add(specifier.local.name);
        }
      },
      'ExportNamedDeclaration:exit'(node) {
        if (isType(node.declaration?.type)) exported -= 1;
      },
      TSTypeAliasDeclaration(node) {
        declaring.push(topLevel(node) ? node.id.name : undefined);
      },
      'TSTypeAliasDeclaration:exit'() {
        declaring.pop();
      },
      TSInterfaceDeclaration(node) {
        declaring.push(topLevel(node) ? node.id.name : undefined);
      },
      'TSInterfaceDeclaration:exit'() {
        declaring.pop();
      },
      TSAnyKeyword(node) {
        if (exported > 0) context.report({ node, messageId: 'any' });
        else if (declaring[0]) pending.push({ node, type: declaring[0] });
      },
      'Program:exit'() {
        for (const { node, type } of pending) {
          if (exportedNames.has(type)) context.report({ node, messageId: 'any' });
        }
      },
    };
  },
};
