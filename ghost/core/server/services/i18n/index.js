const assert = require('node:assert/strict');
const debug = require('@tryghost/debug')('i18n');

let i18nInstance;
let subscription;

exports.changeLanguage = (...args) => {
  assert(i18nInstance, 'Expected i18n instance to be initialized');
  return i18nInstance.changeLanguage(...args);
};

exports.dir = (...args) => {
  assert(i18nInstance, 'Expected i18n instance to be initialized');
  return i18nInstance.dir(...args);
};

exports.t = (...args) => {
  assert(i18nInstance, 'Expected i18n instance to be initialized');
  return i18nInstance.t(...args);
};

/**
 * Create the publication translator for the current locale and follow later
 * locale edits. Shared code may not reach into the server's event bus, so boot
 * passes it in, as it does for the settings cache.
 *
 * @param {object} deps
 * @param {import('node:events').EventEmitter} deps.events - the process event bus that emits `settings.locale.edited`
 */
exports.init = ({ events } = {}) => {
  assert(events, 'Expected the events bus to initialize i18n');

  const i18n = require('@tryghost/i18n').default;
  const settingsCache = require('../../../shared/settings-cache');

  const locale = settingsCache.get('locale') || 'en';

  i18nInstance = i18n(locale, 'ghost');

  // A repeated init replaces the translator, so the listener that followed the
  // previous one has to go with it. Otherwise each init leaves one more behind.
  if (subscription) {
    subscription.events.removeListener('settings.locale.edited', subscription.listener);
  }

  const listener = (model) => {
    debug('locale changed, updating i18n to', model.get('value'));
    i18nInstance.changeLanguage(model.get('value'));
  };
  events.on('settings.locale.edited', listener);
  subscription = { events, listener };
};
