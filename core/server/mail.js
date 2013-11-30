var cp         = require('child_process'),
    url        = require('url'),
    _          = require('underscore'),
    when       = require('when'),
    nodefn     = require('when/node/function'),
    nodemailer = require('nodemailer'),
    api        = require('./api'),
    config     = require('./config');

function GhostMailer(opts) {
    opts = opts || {};
    this.transport = opts.transport || null;
}

// ## E-mail transport setup
// *This promise should always resolve to avoid halting Ghost::init*.
GhostMailer.prototype.init = function () {
    var self = this;
    if (config().mail && config().mail.transport && config().mail.options) {
        this.createTransport(config());
        return when.resolve();
    }

    // if the mail isn't configured, fall back to direct transport
    // Needs nodemailer 0.5.8
    self.transport = nodemailer.createTransport('direct');
    return when.resolve();
};


GhostMailer.prototype.createTransport = function (config) {
    this.transport = nodemailer.createTransport(config.mail.transport, _.clone(config.mail.options));
};


// Sends an e-mail message enforcing `to` (blog owner) and `from` fields
GhostMailer.prototype.send = function (message) {
    if (!this.transport) {
        return when.reject(new Error('Email Error: No e-mail transport configured.'));
    }
    if (!(message && message.subject && message.html)) {
        return when.reject(new Error('Email Error: Incomplete message data.'));
    }
    var transport = this.transport,
        mailStatus = when.defer();

    api.settings.read('email').then(function () {
        var hostname = (url.parse(config().url).hostname !== 'my-ghost-blog.com') ?
                url.parse(config().url).hostname : 'localhost',
            from = (config().mail && config().mail.fromaddress) || 'ghost@' + hostname,
            to = message.to || this.ghost.settings('email');

        message = _.extend(message, {
            from: from,
            to: to,
            generateTextFromHTML: true
        });
    }).then(function () {
        var sendMail = nodefn.lift(transport.sendMail.bind(transport));

        sendMail(message, function (error, response) {
            if (error) {
                return mailStatus.reject(new Error(error));
            }

            response.statusHandler.once("failed", function (data) {
                var reason = '';

                if (data.error.errno === "ENOTFOUND") {
                    reason = 'there is no mail server at this address.';
                }
                mailStatus.reject(new Error("Permanently failed delivering the mail because: " + reason));
            });

            response.statusHandler.once("requeue", function (data) {
                mailStatus.reject(new Error("Message did not send, requed. Probably will not be sent. :( \nMore info: " + data.error.message));
            });

            response.statusHandler.once("sent", function () {
                mailStatus.resolve("Message was accepted by your mail server. Check your inbox or spam folder. :)");
            });
        });
    }).otherwise(function (error) {
        // Proxy the error message so we can add 'Email Error:' to the beginning to make it clearer.
        error =  _.isString(error) ? 'Email Error:' + error : (_.isObject(error) ? 'Email Error: ' + error.message : 'Email Error: Unknown Email Error');
        mailStatus.reject(new Error(error));
    });

    return mailStatus.promise;
};


module.exports = new GhostMailer();
