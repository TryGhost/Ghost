const ghostBookshelf = require('./base');
const { callerTransformerStep } = require('../lib/filters');
const { resolveFilterWithSteps } = require('./base/plugins/filtered-collection');

const Mention = ghostBookshelf.Model.extend(
  {
    tableName: 'mentions',
    defaults: {
      deleted: false,
      verified: false,
      revalidation_failure_count: 0,
    },
    defaultFilters() {
      return 'deleted:false';
    },
  },
  {
    /**
     * A mentions filter is parsed once and rewritten by the caller's own rewrite, then has each
     * condition of defaultFilters() whose key it has no condition on.
     */
    resolveFilter(options) {
      return resolveFilterWithSteps(
        this,
        [callerTransformerStep(options.mongoTransformer)],
        options,
      );
    },

    permittedOptions(methodName) {
      let options = ghostBookshelf.Model.permittedOptions.call(this, methodName);
      const validOptions = {
        findPage: ['selectRaw', 'whereRaw'],
      };

      if (validOptions[methodName]) {
        options = options.concat(validOptions[methodName]);
      }

      return options;
    },
  },
);

module.exports = {
  Mention: ghostBookshelf.model('Mention', Mention),
};
