var templates     = {},
    nodefn        = require('when/node/function'),
    fs            = require('fs'),
    hbs           = require('express-hbs'),
    errors        = require('../errorHandling'),
    path          = require('path'),
    when          = require('when'),
    config        = require('../config'),
    api           = require('../api');

// ## Template utils

// Compile a template for a handlebars helper
templates.compileTemplate = function (templatePath) {
    return nodefn.call(fs.readFile, templatePath).then(function (templateContents) {
        return hbs.handlebars.compile(templateContents.toString());
    }, errors.logAndThrowError);
};

// Load a template for a handlebars helper
templates.loadTemplate = function (name) {
    var templateFileName = name + '.hbs',
        deferred = when.defer();
    // Check for theme specific version first
    return api.settings.read('activeTheme').then(function (activeTheme) {
        var templatePath = path.join(config.paths().themePath, activeTheme.value, 'partials', templateFileName);

        // Can't use nodefn here because exists just returns one parameter, true or false
        fs.exists(templatePath, function (exists) {
            if (!exists) {
                // Fall back to helpers templates location
                templatePath = path.join(config.paths().helperTemplates, templateFileName);
            }

            templates.compileTemplate(templatePath).then(deferred.resolve, deferred.reject);
        });

        return deferred.promise;
    });
};

module.exports = templates;