const hbs = require('express-hbs');
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
            return exhbs.handlebars.compile(source, {preventIndent: true});
        },
        restrictLayoutsTo: themePath
    };

    if (partialsPath) {
        hbsOptions.partialsDir.push(partialsPath);
    }

    return instance.express4(hbsOptions);
};

module.exports = instance;
