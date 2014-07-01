var config        = require('../config'),
    _             = require('lodash'),
    path          = require('path'),
    when          = require('when'),
    api           = require('../api'),
    errors        = require('../errors'),
    storage       = require('../storage'),
    updateCheck   = require('../update-check'),
    adminControllers;

adminControllers = {
    // Route: index
    // Path: /ghost/
    // Method: GET
    'index': function (req, res) {
        /*jslint unparam:true*/
        var userData,
        // config we need on the frontend
            frontConfig = {
                apps: config().apps,
                fileStorage: config().fileStorage
            };

        function renderIndex() {
            res.render('default', {
                user: userData,
                config: JSON.stringify(frontConfig)
            });
        }

        when.join(
            updateCheck(res),
            when(renderIndex())
            // an error here should just get logged
        ).otherwise(errors.logError);
    },
    // Route: upload
    // Path: /ghost/upload/
    // Method: POST
    'upload': function (req, res) {
        var type = req.files.uploadimage.type,
            ext = path.extname(req.files.uploadimage.name).toLowerCase(),
            store = storage.get_storage();

        if ((type !== 'image/jpeg' && type !== 'image/png' && type !== 'image/gif' && type !== 'image/svg+xml')
                || (ext !== '.jpg' && ext !== '.jpeg' && ext !== '.png' && ext !== '.gif' && ext !== '.svg' && ext !== '.svgz')) {
            return res.send(415, 'Unsupported Media Type');
        }

        store
            .save(req.files.uploadimage)
            .then(function (url) {
                return res.send(url);
            })
            .otherwise(function (e) {
                errors.logError(e);
                return res.send(500, e.message);
            });
    },

    // Route: doSignup
    // Path: /ghost/setup/
    // Method: POST
    'doSignup': function (req, res) {
        var name = req.body.name,
            email = req.body.email,
            password = req.body.password,
            blogTitle = req.body.blogTitle,
            users = [{
                name: name,
                email: email,
                password: password
            }];

        api.users.register({users: users}).then(function () {
            var settings = [];

            settings.push({key: 'email', value: email});

            // Handles the additional values set by the setup screen.
            if (!_.isEmpty(blogTitle)) {
                settings.push({key: 'title', value: blogTitle});
                settings.push({key: 'description', value: 'Thoughts, stories and ideas by ' + name});
            }

            api.settings.edit({settings: settings}, {context: {user: 1}}).then(function () {
                var message = {
                        to: email,
                        subject: 'Your New Ghost Blog',
                        html: '<p><strong>Hello!</strong></p>' +
                              '<p>Good news! You\'ve successfully created a brand new Ghost blog over on ' + config().url + '</p>' +
                              '<p>You can log in to your admin account with the following details:</p>' +
                              '<p> Email Address: ' + email + '<br>' +
                              'Password: The password you chose when you signed up</p>' +
                              '<p>Keep this email somewhere safe for future reference, and have fun!</p>' +
                              '<p>xoxo</p>' +
                              '<p>Team Ghost<br>' +
                              '<a href="https://ghost.org">https://ghost.org</a></p>'
                    },
                    payload = {
                        mail: [{
                            message: message,
                            options: {}
                        }]
                    };

                api.mail.send(payload).otherwise(function (error) {
                    errors.logError(
                        error.message,
                        "Unable to send welcome email, your blog will continue to function.",
                        "Please see http://docs.ghost.org/mail/ for instructions on configuring email."
                    );
                });
                res.json(200, {
                    redirect: config().paths.subdir + '/ghost/'
                });

            });
        }).otherwise(function (error) {
            res.json(401, {error: error.message});
        });
    }
};

module.exports = adminControllers;
