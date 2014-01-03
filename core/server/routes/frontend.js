var frontend    = require('../controllers/frontend');

module.exports = function (server) {
    /*jslint regexp: true */

    // ### Frontend routes
    server.get('/rss/', frontend.rss);
    server.get('/rss/:page/', frontend.rss);
    server.get('/page/:page/', frontend.homepage);
    // Only capture the :slug part of the URL
    // This regex will always have two capturing groups,
    // one for date, and one for the slug.
    // Examples:
    //  Given `/plain-slug/` the req.params would be [undefined, 'plain-slug']
    //  Given `/2012/12/24/plain-slug/` the req.params would be ['2012/12/24/', 'plain-slug']
    //  Given `/plain-slug/edit/` the req.params would be [undefined, 'plain-slug', 'edit']
    server.get(/^\/([0-9]{4}\/[0-9]{2}\/[0-9]{2}\/)?([^\/.]*)\/$/, frontend.single);
    server.get(/^\/([0-9]{4}\/[0-9]{2}\/[0-9]{2}\/)?([^\/.]*)\/edit\/$/, frontend.edit);
    server.get('/', frontend.homepage);
};