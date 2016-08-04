var ampContentHelper   = require('./amp_content'),
    ampComponentHelper = require('./amp_components'),
    ampHeadHelper      = require('./amp_head');

registerHelpers = function (ghost) {
    ghost.helpers.register('amp_content', function () {
        return ampContentHelper.apply(this, arguments);
    });

    ghost.helpers.register('amp_components', function () {
        return ampComponentHelper.apply(this, arguments);
    });

    ghost.helpers.register('amp_head', function () {
        return ampHeadHelper.apply(this, arguments);
    });
};

module.exports = registerHelpers;
