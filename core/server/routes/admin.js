var admin       = require('../controllers/admin'),
    config      = require('../config'),
    middleware  = require('../middleware').middleware;

module.exports = function (server) {
    var subdir = config.paths().subdir;
    // ### Admin routes
    /* TODO: put these somewhere in admin */
    server.get('/logout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.redirect(301, subdir + '/ghost/signout/');
    });
    server.get('/signout/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.redirect(301, subdir + '/ghost/signout/');
    });
    server.get('/signin/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.redirect(301, subdir + '/ghost/signin/');
    });
    server.get('/signup/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.redirect(301, subdir + '/ghost/signup/');
    });
    server.get('/ghost/login/', function redirect(req, res) {
        /*jslint unparam:true*/
        res.redirect(301, subdir + '/ghost/signin/');
    });

    server.get('/ghost/signout/', admin.logout);
    server.get('/ghost/signin/', middleware.redirectToSignup, middleware.redirectToDashboard, admin.login);
    server.get('/ghost/signup/', middleware.redirectToDashboard, admin.signup);
    server.get('/ghost/forgotten/', middleware.redirectToDashboard, admin.forgotten);
    server.post('/ghost/forgotten/', admin.generateResetToken);
    server.get('/ghost/reset/:token', admin.reset);
    server.post('/ghost/reset/:token', admin.resetPassword);
    server.post('/ghost/signin/', admin.auth);
    server.post('/ghost/signup/', admin.doRegister);
    server.post('/ghost/changepw/', middleware.auth, admin.changepw);
    server.get('/ghost/editor(/:id)/', middleware.auth, admin.editor);
    server.get('/ghost/editor/', middleware.auth, admin.editor);
    server.get('/ghost/content/', middleware.auth, admin.content);
    server.get('/ghost/settings*', middleware.auth, admin.settings);
    server.get('/ghost/debug/', middleware.auth, admin.debug.index);

    server.post('/ghost/upload/', middleware.auth, middleware.busboy, admin.uploader);

    // redirect to /ghost and let that do the authentication to prevent redirects to /ghost//admin etc.
    server.get(/\/((ghost-admin|admin|wp-admin|dashboard|signin)\/?)$/, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });
    server.get(/\/(ghost$\/?)/, middleware.auth, function (req, res) {
        /*jslint unparam:true*/
        res.redirect(subdir + '/ghost/');
    });
    server.get('/ghost/', middleware.redirectToSignup, middleware.auth, admin.index);
};