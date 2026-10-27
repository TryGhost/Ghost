import type { I18nFactory } from '@tryghost/i18n';
import { defineService } from '../../../kernel/define-service';

export default defineService('i18n', () => {
  const debug = require('@tryghost/debug')('i18n');
  const i18n: I18nFactory = require('@tryghost/i18n').default;
  const events = require('../../lib/common/events');
  const settingsCache = require('../../../shared/settings-cache');

  const translator = i18n(settingsCache.get('locale') || 'en', 'ghost');

  events.on('settings.locale.edited', (model: { get: (key: string) => string }) => {
    debug('locale changed, updating i18n to', model.get('value'));
    translator.changeLanguage(model.get('value'));
  });

  return translator;
});
