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

        handlebars.registerHelper('avoidOrphanedWords', function (text) {
            let replacement = text?.trim?.();

            if (!replacement) {
                return '';
            }

            // replace last space with &nbsp; to avoid orphaned words when wrapping
            const lastSpaceIndex = replacement.lastIndexOf(' ');
            if (lastSpaceIndex !== -1) {
                replacement =
                    handlebars.escapeExpression(replacement.substring(0, lastSpaceIndex)) +
                    '&nbsp;' +
                    handlebars.escapeExpression(replacement.substring(lastSpaceIndex + 1));
            }

            return new handlebars.SafeString(replacement);
        });
    }
};
