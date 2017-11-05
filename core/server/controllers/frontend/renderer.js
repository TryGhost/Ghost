var debug = require('ghost-ignition').debug('renderer');

module.exports = function renderer(req, res, data) {
    // Render Call
    debug('Rendering template: ' + res.template + ' for: ' + req.originalUrl);
    debug('res.locals', res.locals);
    res.render(res.template, data);
};
