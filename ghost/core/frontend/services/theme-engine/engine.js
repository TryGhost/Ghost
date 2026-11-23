const hbs = require('express-hbs');
const config = require('../../../shared/config');
const instance = hbs.create();

// @TODO think about a config option for this e.g. theme.devmode?
if (config.get('env') !== 'production') {
  instance.handlebars.logger.level = 0;
}

instance.escapeExpression = instance.handlebars.Utils.escapeExpression;

function configure(hbsInstance, partialsPath, themePath) {
  const hbsOptions = {
    partialsDir: [config.get('paths').helperTemplates],
    onCompile: function onCompile(exhbs, source) {
      return exhbs.handlebars.compile(source, { preventIndent: true });
    },
    restrictLayoutsTo: themePath,
  };

  if (partialsPath) {
    hbsOptions.partialsDir.push(partialsPath);
  }

  return hbsInstance.express4(hbsOptions);
}

instance.configure = function (partialsPath, themePath) {
  return configure(instance, partialsPath, themePath);
};

/**
 * An engine for previewing a theme that isn't active. It has its own Handlebars
 * environment, so the theme's partials never mix with the active theme's, and
 * carries the helpers registered on the main engine.
 *
 * @param {string|null} partialsPath
 * @param {string} themePath
 * @returns {{hbs: object, render: Function}}
 */
instance.createPreviewEngine = function (partialsPath, themePath) {
  const previewInstance = instance.create();
  previewInstance.escapeExpression = instance.escapeExpression;
  Object.assign(previewInstance.handlebars.helpers, instance.handlebars.helpers);

  // Configuring re-registers express-hbs's own block helpers, bound to this instance
  const render = configure(previewInstance, partialsPath, themePath);

  return { hbs: previewInstance, render };
};

module.exports = instance;
