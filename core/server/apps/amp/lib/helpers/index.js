var ampContentHelper   = require('./amp_content'),
    ampComponentsHelper = require('./amp_components'),
    registerAmpHelpers;

registerAmpHelpers = function (ghost) {
    ghost.helpers.registerAsync('amp_content', ampContentHelper);

    ghost.helpers.register('amp_components', ampComponentsHelper);
};

module.exports = registerAmpHelpers;
