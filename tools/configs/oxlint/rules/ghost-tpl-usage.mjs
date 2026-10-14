// Migrated from eslint-plugin-ghost. Preserve its matching behavior.
export default {
  meta: {
    docs: {
      description: 'Enforce correct usage of @tryghost/tpl',
      category: 'Ghost',
      recommended: false,
    },
    messages: {
      requireVariable:
        'Calls to tpl should not use literal strings. Please define all strings in a messages object.',
    },
  },
  create(context) {
    // 'CallExpression[callee.name=tpl][arguments.0.type=Literal]',

    return {
      'CallExpression[callee.name=tpl][arguments.0.type=Literal]': function (node) {
        context.report({ node, messageId: 'requireVariable' });
      },
    };
  },
};
