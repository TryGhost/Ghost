import type { Frame } from '@tryghost/api-framework';

module.exports = {
  browse(models: unknown, apiConfig: unknown, frame: Frame) {
    frame.response = {
      custom_theme_settings: models,
    };
  },

  edit(models: unknown, apiConfig: unknown, frame: Frame) {
    frame.response = {
      custom_theme_settings: models,
    };
  },
};
