var _          = require('lodash'),
    Promise    = require('bluebird'),
    nodemailer = require('nodemailer'),
    config     = require('./config');

function GhostMailer(opts) {
    opts = opts || {};
    this.transport = opts.transport || null;
}

// ## E-mail transport setup
// *This promise should always resolve to avoid halting Ghost::init*.
GhostMailer.prototype.init = function () {
    var self = this;
    self.state = {};
    if (config.mail && config.mail.transport) {
        this.createTransport();
        return Promise.resolve();
    }

    self.transport = nodemailer.createTransport('direct');
    self.state.usingDirect = true;

    return Promise.resolve();
};

GhostMailer.prototype.createTransport = function () {
    this.transport = nodemailer.createTransport(config.mail.transport, _.clone(config.mail.options) || {});
};


GhostMailer.prototype.fromAddress = function () {
    var from = config.mail && config.mail.fromaddress,
        domain;

    if (!from) {
        // Extract the domain name from url set in config.js
        domain = config.url.match(new RegExp('^https?://([^/:?#]+)(?:[/:?#]|$)', 'i'));
        domain = domain && domain[1];

        // Default to ghost@[blog.url]
        from = 'ghost@' + domain;
    }

    return from;
};

// Sends an e-mail message enforcing `to` (blog owner) and `from` fields
// This assumes that api.settings.read('email') was aready done on the API level
GhostMailer.prototype.send = function (message) {
    var self = this,
        to,
        sendMail;

    message = message || {};
    to = message.to || false;

    if (!this.transport) {
        return Promise.reject(new Error('Email Error: No e-mail transport configured.'));
    }
    if (!(message && message.subject && message.html && message.to)) {
        return Promise.reject(new Error('Email Error: Incomplete message data.'));
    }
    sendMail = Promise.promisify(self.transport.sendMail.bind(self.transport));

    message = _.extend(message, {
        from: self.fromAddress(),
        to: to,
        generateTextFromHTML: true
    });

    return new Promise(function (resolve, reject) {
        sendMail(message, function (error, response) {
            if (error) {
                return reject(new Error(error));
            }

            if (self.transport.transportType !== 'DIRECT') {
                return resolve(response);
            }

            response.statusHandler.once("failed", function (data) {
                var reason = 'Email Error: Failed sending email';
                if (data.error.errno === "ENOTFOUND") {
                    reason += ': there is no mail server at this address: ' + data.domain;
                }
                reason += '.';
                return reject(new Error(reason));
            });

            response.statusHandler.once("requeue", function (data) {
                return reject(new Error("Email Error: message was not sent, requeued. Probably will not be sent. :( \nMore info: " + data.error.message));
            });

            response.statusHandler.once("sent", function () {
                return resolve("Message was accepted by the mail server. Make sure to check inbox and spam folders. :)");
            });
        });
    });
};

module.exports = new GhostMailer();
