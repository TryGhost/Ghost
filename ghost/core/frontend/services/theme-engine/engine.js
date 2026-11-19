const hbs = require('express-hbs');
const announcementBar = require('./announcement-bar');
const config = require('../../../shared/config');
const instance = hbs.create();

// @TODO think about a config option for this e.g. theme.devmode?
if (config.get('env') !== 'production') {
  instance.handlebars.logger.level = 0;
}

instance.escapeExpression = instance.handlebars.Utils.escapeExpression;

instance.configure = function configure(partialsPath, themePath) {
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

  const render = instance.express4(hbsOptions);
  return (filename, options, callback) => {
    render(filename, options, (err, html) => {
      if (err) {
        return callback(err);
      }

      try {
        html = announcementBar.insert(html, options._locals);
      } catch (error) {
        return callback(error);
      }
      callback(null, html);
    });
  };
};

module.exports = instance;
