var admin       = require('../controllers/admin'),
    config      = require('../config'),
    middleware  = require('../middleware').middleware,

    ONE_HOUR_S  = 60 * 60,
    ONE_YEAR_S  = 365 * 24 * ONE_HOUR_S;

module.exports = function (server) {
    var subdir = config().paths.subdir;
    // ### Admin routes
    server.get('/logout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    server.get('/signout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signout/');
    });
    server.get('/signin/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signin/');
    });
    server.get('/signup/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.set({'Cache-Control': 'public, max-age=' + ONE_YEAR_S});
        res.redirect(301, subdir + '/ghost/signup/');
    });

    server.get('/ghost/signout/', admin.signout);
    server.get('/ghost/signin/', middleware.redirectToSignup, middleware.redirectToDashboard, admin.signin);
    server.post('/ghost/signin/', admin.doSignin);
    server.get('/ghost/signup/', middleware.redirectToDashboard, admin.signup);
    server.post('/ghost/signup/', admin.doSignup);
    server.get('/ghost/forgotten/', middleware.redirectToDashboard, admin.forgotten);
    server.post('/ghost/forgotten/', admin.doForgotten);
    server.get('/ghost/reset/:token', admin.reset);
    server.post('/ghost/reset/:token', admin.doReset);
    server.post('/ghost/changepw/', admin.doChangePassword);

    server.get('/ghost/editor(/:id)/', admin.editor);
    server.get('/ghost/editor/', admin.editor);
    server.get('/ghost/content/', admin.content);
    server.get('/ghost/settings*', admin.settings);
    server.get('/ghost/debug/', admin.debug.index);

    server.get('/ghost/export/', admin.debug.exportContent);

    server.post('/ghost/upload/', middleware.busboy, admin.upload);

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    server.get(/\/((ghost-admin|admin|wp-admin|dashboard|signin)\/?)$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });
    server.get(/\/ghost$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });
    server.get('/ghost/', admin.index);
};