import { nodeLibConfig } from '@internal/cfg-eslint';

// These two rules hold Ghost's server to @tryghost/errors. The SDK runs in an app's page and
// has its own error, constructed the way JavaScript errors are: `new GhostAppError(code,
// message)`. The fake Admin in the tests rejects calls with plain errors, as Admin does.
const errorRulesOff = {
  'ghost/ghost-custom/no-native-error': 'off',
  'ghost/ghost-custom/ghost-error-usage': 'off',
};

export default nodeLibConfig({
  extraSrcRules: errorRulesOff,
  extraTestRules: errorRulesOff,
});
