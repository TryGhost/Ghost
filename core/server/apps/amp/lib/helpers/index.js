var ampContentHelper   = require('./amp_content'),
    ampComponentsHelper = require('./amp_components'),
    registerAsyncThemeHelper = require('../../../../helpers').registerAsyncThemeHelper,
    ghostHead = require('../../../../helpers/ghost_head'),
    registerAmpHelpers;

registerAmpHelpers = function (ghost) {
    ghost.helpers.registerAsync('amp_content', ampContentHelper);

    ghost.helpers.register('amp_components', ampComponentsHelper);

    // we use the {{ghost_head}} helper, but call it {{amp_ghost_head}}, so it's consistent
    registerAsyncThemeHelper('amp_ghost_head', ghostHead);
};

module.exports = registerAmpHelpers;
