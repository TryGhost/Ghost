module.exports = {
    registerHelpers(handlebars, labs, thist) {
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

        handlebars.registerHelper('eq', function (a, b) {
            return a === b;
        });

        handlebars.registerHelper('hasFeature', function () {
            // Get all arguments except the last one (options)
            const options = arguments[arguments.length - 1];
            const flags = Array.from(arguments).slice(0, -1);

            // Check if any of the flags are set
            const hasAnyFeature = flags.some(f => labs.isSet(f));

            if (hasAnyFeature) {
                return options.fn(this);
            } else {
                return options.inverse(this);
            }
        });

        handlebars.registerHelper('t', function (key, options) {
            let hash = options?.hash;
            return thist(key, hash || options || {});
        });
    }
};
