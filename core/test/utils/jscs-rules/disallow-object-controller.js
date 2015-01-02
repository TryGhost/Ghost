var assert = require('assert');

module.exports = function () {};

module.exports.prototype = {
    configure: function (disallowObjectController) {
        assert(
            typeof disallowObjectController === 'boolean',
            'disallowObjectController option requires boolean value'
        );
        assert(
            disallowObjectController === true,
            'disallowObjectController option requires true value or should be removed'
        );
    },

    getOptionName: function () {
        return 'disallowObjectController';
    },

    check: function (file, errors) {
        var lines = file.getLines();

        lines.forEach(function (line, index) {
            var location = line.indexOf(/ObjectController.extend/);

            if (location !== -1) {
                errors.add('Ember.ObjectController is deprecated, please use Ember.Controller and access model properties directly.', index + 1, location + 1);
            }
        });
    }
};
