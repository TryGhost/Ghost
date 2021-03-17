// Dirty require!
const ghostHead = require('../../../../helpers/ghost_head');

function registerAmpHelpers(ghost) {
    ghost.helpers.registerAsync('amp_content', require('./amp_content'));

    ghost.helpers.register('amp_components', require('./amp_components'));

    ghost.helpers.register('amp_analytics', require('./amp_analytics'));

    // we use the {{ghost_head}} helper, but call it {{amp_ghost_head}}, so it's consistent
    ghost.helpers.registerAsync('amp_ghost_head', ghostHead);

    // additional injected styles for use inside the single <style amp-custom> tag
    ghost.helpers.register('amp_style', require('./amp_style'));
}

module.exports = registerAmpHelpers;
