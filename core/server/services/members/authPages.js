const {static} = require('express');
const path = require('path');

module.exports = static(
    path.join(
        require.resolve('@tryghost/members-auth-pages'),
        '../dist'
    )
);
