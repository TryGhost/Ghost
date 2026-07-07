const hbs = require('express-hbs');

/**
 * @param {object} deps
 * @param {{get: (key: string) => unknown}} deps.deploymentConfig
 */
module.exports = function createEngine({deploymentConfig}) {
    const instance = hbs.create();

    // @TODO think about a config option for this e.g. theme.devmode?
    if (deploymentConfig.get('env') !== 'production') {
        instance.handlebars.logger.level = 0;
    }

    instance.escapeExpression = instance.handlebars.Utils.escapeExpression;

    instance.configure = function configure(partialsPath, themePath) {
        const hbsOptions = {
            partialsDir: [deploymentConfig.get('paths').helperTemplates],
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

    return instance;
};
