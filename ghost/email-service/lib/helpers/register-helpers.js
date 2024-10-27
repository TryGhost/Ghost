module.exports = {
    registerHelpers(handlebars, labs) {
        handlebars.registerHelper('if', function (conditional, options) {
            if (conditional) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        handlebars.registerHelper('and', function () {
            const len = arguments.length - 1;

            for (let i = 0; i < len; i++) {
                if (!arguments[i]) {
                    return false;
                }
            }

            return true;
        });

        handlebars.registerHelper('not', function () {
            const len = arguments.length - 1;

            for (let i = 0; i < len; i++) {
                if (!arguments[i]) {
                    return true;
                }
            }

            return false;
        });

        handlebars.registerHelper('or', function () {
            const len = arguments.length - 1;

            for (let i = 0; i < len; i++) {
                if (arguments[i]) {
                    return true;
                }
            }

            return false;
        });

        handlebars.registerHelper('hasFeature', function (flag, options) {
            if (labs.isSet(flag)) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        handlebars.registerHelper('t', function (key, options) {
            let i18n = require('../../i18n-setup');
            return i18n.t(key, options);
        });
    }
};
