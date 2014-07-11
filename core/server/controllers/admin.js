var config        = require('../config'),
    path          = require('path'),
    when          = require('when'),
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
    }
};

module.exports = adminControllers;
