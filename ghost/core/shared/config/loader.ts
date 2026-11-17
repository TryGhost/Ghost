import * as localUtils from './utils';
import { loadConfigSources } from '@tryghost/foundry/config';
import { createConfig, type GhostConfig } from './validated';

const _debug = require('@tryghost/debug')._base;
const debug = _debug('ghost:config');

interface LoadNconfOptions {
  baseConfigPath?: string;
  customConfigPath?: string;
}

export type ConfigInstance = GhostConfig;

function loadNconf(options?: LoadNconfOptions): ConfigInstance {
  debug('config start');
  const env = localUtils.getNodeEnv();
  options = options || {};

  const baseConfigPath = options.baseConfigPath || __dirname;
  const customConfigPath = options.customConfigPath || process.cwd();

  // ## Load Config

  // Layering the sources is the framework's: see ../../foundry/config/sources.ts.
  // Ghost says where its files are and which of them it reads.
  const tree = loadConfigSources({
    env,
    baseDir: baseConfigPath,
    customDir: customConfigPath,
    local: !env.startsWith('testing'),
    extraEnvFiles:
      process.env.GHOST_DEV_IS_DOCKER === 'true'
        ? { 'docker-env': 'config.development.docker.json' }
        : {},
    prepareBundledStore: localUtils.makeBundledDatabasePathsAbsolute,
    labels: localUtils.configLabels,
  });

  // `paths` and `database` are normalised by the schema, in createConfig.

  // ## Other Stuff!

  // Manually set values
  tree.env = env;

  // To output this, use DEBUG=ghost:*,ghost-config
  if (_debug.enabled('ghost-config')) {
    debug(tree);
  }

  debug('config end');

  const config = createConfig(tree);

  // the schema makes contentPath absolute, so it's checked once that's happened
  localUtils.assertContentPathExists(config.get('paths:contentPath'));

  return config;
}

export { loadNconf };
