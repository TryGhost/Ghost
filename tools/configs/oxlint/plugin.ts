import type { Plugin } from '@oxlint/plugins';

import { noInjectedServiceLibraries } from './rules/no-injected-service-libraries.ts';
import { noNativeError } from './rules/no-native-error.ts';
import { serviceRootShape } from './rules/service-root-shape.ts';
import { ghostErrorUsage } from './rules/ghost-error-usage.ts';
import { ghostTplUsage } from './rules/ghost-tpl-usage.ts';
import { maxApiComplexity } from './rules/max-api-complexity.ts';
import { maxApiLines } from './rules/max-api-lines.ts';
import { nodeAssertMethods } from './rules/node-assert-methods.ts';
import { nodeAssertParams } from './rules/node-assert-params.ts';
import { nodeAssertStrict } from './rules/node-assert-strict.ts';

const plugin: Plugin = {
  rules: {
    'no-injected-service-libraries': noInjectedServiceLibraries,
    // Preserve the existing rule name so its inline exceptions still apply.
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

export default plugin;
