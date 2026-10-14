import noNativeError from './rules/no-native-error.mjs';
import serviceRootShape from './rules/service-root-shape.mjs';
import ghostErrorUsage from './rules/ghost-error-usage.mjs';
import ghostTplUsage from './rules/ghost-tpl-usage.mjs';
import maxApiComplexity from './rules/max-api-complexity.mjs';
import maxApiLines from './rules/max-api-lines.mjs';
import nodeAssertMethods from './rules/node-assert-methods.mjs';
import nodeAssertParams from './rules/node-assert-params.mjs';
import nodeAssertStrict from './rules/node-assert-strict.mjs';

export default {
  rules: {
    'ghost-custom/no-native-error': noNativeError,
    'service-root-shape': serviceRootShape,
    'ghost-custom/ghost-error-usage': ghostErrorUsage,
    'ghost-custom/ghost-tpl-usage': ghostTplUsage,
    'ghost-custom/max-api-complexity': maxApiComplexity,
    'ghost-custom/max-api-lines': maxApiLines,
    'ghost-custom/node-assert-methods': nodeAssertMethods,
    'ghost-custom/node-assert-params': nodeAssertParams,
    'ghost-custom/node-assert-strict': nodeAssertStrict,
  },
};
