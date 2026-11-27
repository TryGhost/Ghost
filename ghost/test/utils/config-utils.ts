import _ from 'lodash';
import net from 'node:net';
import type { ConfigInstance } from '../../core/shared/config/loader';

// require, not import: the config instance mutated here must be the one the
// CommonJS `require` graph hands to Ghost's own modules, so values set in a
// test are the ones the code under test reads.
const config: ConfigInstance = require('../../core/shared/config');

const defaultConfig = _.cloneDeep(config.validated);

const clearDerivedContentPaths = function () {
  config.set('adapters:redirects:FileStore:basePath', undefined);
};

/**
 * configUtils.set({});
 * configUtils.set('key', 'value');
 */
function set(values: Record<string, unknown>): void;
function set(key: string, value: unknown): void;
function set(key: string | Record<string, unknown>, value?: unknown): void {
  if (_.isObject(key)) {
    _.each(key, function (settingValue, settingKey) {
      config.set(settingKey, settingValue);
    });
    if (Object.hasOwn(key, 'paths:contentPath')) {
      clearDerivedContentPaths();
    }
  } else {
    config.set(key, value);
    if (key === 'paths:contentPath') {
      clearDerivedContentPaths();
    }
  }
}

/**
 * Drop every override a test applied.
 *
 * reset() rebuilds from the config the loader produced, so it is enough on its
 * own. This used to reset and then re-apply all ~117 top-level keys one at a
 * time, which nconf needed - its reset() empties the stores - but which now just
 * re-adds every default as an explicit override, at a full rebuild each.
 */
async function restore(): Promise<void> {
  config.reset();
}

function getServerUrl({ protocol = 'http' }: { protocol?: string } = {}): string {
  const host: string = config.get('server:host');
  const port: number = config.get('server:port');
  const hostname = net.isIPv6(host) ? `[${host}]` : host;

  return `${protocol}://${hostname}:${port}`;
}

const configUtils = { config, defaultConfig, set, restore, getServerUrl };

export { config, defaultConfig, set, restore, getServerUrl };
export default configUtils;
