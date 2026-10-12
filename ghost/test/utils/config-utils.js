const _ = require('lodash');
const net = require('net');
const config = require('../../core/shared/config');
const configUtils = {};

configUtils.config = config;
configUtils.defaultConfig = _.cloneDeep(config.get());

const clearDerivedContentPaths = function () {
  config.set('adapters:redirects:FileStore:basePath', undefined);
};

/**
 * configUtils.set({});
 * configUtils.set('key', 'value');
 */
configUtils.set = function () {
  const key = arguments[0];
  const value = arguments[1];

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
};

/**
 * Drop every override a test applied.
 *
 * reset() rebuilds from the config the loader produced, so it is enough on its
 * own. This used to reset and then re-apply all ~117 top-level keys one at a
 * time, which nconf needed - its reset() empties the stores - but which now just
 * re-adds every default as an explicit override, at a full rebuild each.
 */
configUtils.restore = async function () {
  config.reset();
};

configUtils.getServerUrl = function ({ protocol = 'http' } = {}) {
  const host = config.get('server:host');
  const port = config.get('server:port');
  const hostname = net.isIPv6(host) ? `[${host}]` : host;

  return `${protocol}://${hostname}:${port}`;
};

module.exports = configUtils;
