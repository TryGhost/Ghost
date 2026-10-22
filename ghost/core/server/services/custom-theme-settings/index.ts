import { defineService } from '../../../kernel/define-service';

const CustomThemeSettingsService = require('./custom-theme-settings-service');

export default defineService('Custom theme settings', () => {
  return new CustomThemeSettingsService({
    model: require('../../models').CustomThemeSetting,
    cache: require('../../../shared/custom-theme-settings-cache'),
    debug: require('@tryghost/debug')('custom-theme-settings-service'),
  });
});
