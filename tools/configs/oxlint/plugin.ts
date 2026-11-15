import type { Plugin } from '@oxlint/plugins';

import { bootAwaitsServiceInit } from './rules/boot-awaits-service-init.ts';
import { noAnyInExportedTypes } from './rules/no-any-in-exported-types.ts';
import { noAssertErrorInstance } from './rules/no-assert-error-instance.ts';
import { noInjectedServiceLibraries } from './rules/no-injected-service-libraries.ts';
import { noNativeError } from './rules/no-native-error.ts';
import { noRealLoggerInjection } from './rules/no-real-logger-injection.ts';
import { preferCanonicalTypes } from './rules/prefer-canonical-types.ts';
import { serviceRootShape } from './rules/service-root-shape.ts';
import { stopFrontendAgents } from './rules/stop-frontend-agents.ts';
import { ghostErrorUsage } from './rules/ghost-error-usage.ts';
import { ghostTplUsage } from './rules/ghost-tpl-usage.ts';
import { maxApiComplexity } from './rules/max-api-complexity.ts';
import { maxApiLines } from './rules/max-api-lines.ts';
import { nodeAssertMethods } from './rules/node-assert-methods.ts';
import { nodeAssertParams } from './rules/node-assert-params.ts';
import { nodeAssertStrict } from './rules/node-assert-strict.ts';

const plugin: Plugin = {
  rules: {
    'boot-awaits-service-init': bootAwaitsServiceInit,
    'no-any-in-exported-types': noAnyInExportedTypes,
    'no-assert-error-instance': noAssertErrorInstance,
    'no-injected-service-libraries': noInjectedServiceLibraries,
    'no-real-logger-injection': noRealLoggerInjection,
    'stop-frontend-agents': stopFrontendAgents,
    // Preserve the existing rule name so its inline exceptions still apply.
    'ghost-custom/no-native-error': noNativeError,
    'prefer-canonical-types': preferCanonicalTypes,
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
