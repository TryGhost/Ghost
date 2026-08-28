const settingsCache = require('../../../shared/settings-cache');
const PasskeyService = require('./passkey-service');

module.exports = new PasskeyService({
  getSecret: () => settingsCache.get('admin_session_secret'),
  getSiteTitle: () => {
    const title = settingsCache.get('title');
    return typeof title === 'string' ? title : undefined;
  },
});
