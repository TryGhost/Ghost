import path from 'node:path';

export default {
  meta: {
    type: 'problem',
    schema: [{ type: 'string' }, { type: ['boolean', 'null'] }, { type: ['boolean', 'null'] }],
  },
  create(context) {
    const pattern = new RegExp(context.options[0]);
    const ignoreExporting = Boolean(context.options[1]);
    return {
      Program(node) {
        if (ignoreExporting) {
          const hasExport = node.body.some(
            (stmt) =>
              stmt.type === 'ExportDefaultDeclaration' ||
              stmt.type === 'ExportNamedDeclaration' ||
              (stmt.type === 'ExpressionStatement' &&
                stmt.expression.type === 'AssignmentExpression' &&
                stmt.expression.left.type === 'MemberExpression' &&
                stmt.expression.left.object.type === 'Identifier' &&
                stmt.expression.left.object.name === 'module' &&
                stmt.expression.left.property.type === 'Identifier' &&
                stmt.expression.left.property.name === 'exports'),
          );
          if (hasExport) return;
        }
        const filename = path.parse(context.filename).name;
        if (!pattern.test(filename)) {
          context.report({
            node,
            message: `Filename '${filename}' does not match the naming convention.`,
          });
        }
      },
    };
  },
};
