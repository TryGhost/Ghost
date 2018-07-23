// Dirty require!
const ghostHead = require('../../../../helpers/ghost_head');

function registerAmpHelpers(ghost) {
    ghost.helpers.registerAsync('amp_content', require('./amp_content'));

    ghost.helpers.register('amp_components', require('./amp_components'));

    // we use the {{ghost_head}} helper, but call it {{amp_ghost_head}}, so it's consistent
    ghost.helpers.registerAsync('amp_ghost_head', ghostHead);
}

module.exports = registerAmpHelpers;
