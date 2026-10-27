import Nconf from 'nconf';
import path from 'node:path';
import * as localUtils from './utils';
import { loadSecretsFromEnv, isSecretFileRef } from './secrets';
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
  const nconf = new Nconf.Provider();

  // ## Load Config

  // no channel can override the overrides
  nconf.file('overrides', path.join(baseConfigPath, 'overrides.json'));

  // command line arguments take precedence, then secret files, then environment variables
  nconf.argv();
  // secrets are not parsed - a password like `01234` must stay a string
  nconf.add('secrets', { type: 'literal', store: loadSecretsFromEnv() });
  nconf.env({
    separator: '__',
    parseValues: true,
    // the secrets store has already resolved these, so keep the file paths themselves
    // out of config - otherwise e.g. `database:connection` gains a bogus `password_FILE` key
    transform: ({ key, value }: { key: string; value: string }) =>
      isSecretFileRef(key) ? false : { key, value },
  });

  // Now load various config json files
  nconf.file('custom-env', path.join(customConfigPath, 'config.' + env + '.json'));
  if (!env.startsWith('testing')) {
    if (process.env.GHOST_DEV_IS_DOCKER === 'true') {
      nconf.file('docker-env', path.join(baseConfigPath, 'env', 'config.development.docker.json'));
    }
    nconf.file('local-env', path.join(customConfigPath, 'config.local.json'));
    nconf.file('local-env-jsonc', {
      file: path.join(customConfigPath, 'config.local.jsonc'),
      format: localUtils.jsoncFormat,
    });
  }
  nconf.file('default-env', path.join(baseConfigPath, 'env', 'config.' + env + '.json'));

  // Finally, we load defaults, if nothing else has a value this will
  nconf.file('defaults', path.join(baseConfigPath, 'defaults.json'));

  for (const name of ['overrides', 'docker-env', 'default-env', 'defaults']) {
    localUtils.makeBundledDatabasePathsAbsolute(nconf.stores[name]?.store);
  }

  // ## Hand over

  // nconf's job ends here: it layered the sources. Everything below works on
  // the merged plain tree, and the validated, frozen tree createConfig returns
  // is the only representation anything reads from now on. See ./schema.ts.
  const tree = localUtils.mergeStores(nconf);

  // ## Sanitization

  // transform all relative paths to absolute paths
  localUtils.makePathsAbsolute(tree.paths);

  localUtils.sanitizeDatabaseProperties(tree.database);

  // Check if the URL in config has a protocol
  localUtils.checkUrlProtocol(tree.url);

  // Ensure that the content path exists
  localUtils.doesContentPathExist((tree.paths as Record<string, unknown> | undefined)?.contentPath);

  // ## Other Stuff!

  // Manually set values
  tree.env = env;

  // To output this, use DEBUG=ghost:*,ghost-config
  if (_debug.enabled('ghost-config')) {
    debug(tree);
  }

  debug('config end');

  return createConfig(tree);
}

export { loadNconf };
