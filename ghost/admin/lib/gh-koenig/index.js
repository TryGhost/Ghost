/* eslint-env node */
'use strict';

const Funnel = require('broccoli-funnel');

module.exports = {
    name: 'gh-koenig',

    isDevelopingAddon() {
        return true;
    },

    treeForPublic() {
        return new Funnel(`${__dirname}/public/tools/`, {
            destDir: 'assets/tools/'
        });
    }
};
