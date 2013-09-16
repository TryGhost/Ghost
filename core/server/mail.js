var cp = require('child_process'),
    url = require('url'),
    _ = require('underscore'),
    when = require('when'),
    nodefn = require('when/node/function'),
    nodemailer = require('nodemailer');

function GhostMailer(opts) {
    opts = opts || {};
    this.transport = opts.transport || null;
}

// ## E-mail transport setup
// *This promise should always resolve to avoid halting Ghost::init*.
GhostMailer.prototype.init = function (ghost) {
    this.ghost = ghost;
    // TODO: fix circular reference ghost -> mail -> api -> ghost, remove this late require
    this.api = require('./api');

    var self = this,
        config = ghost.config();

    if (config.mail && config.mail.transport && config.mail.options) {
        this.createTransport(config);
        return when.resolve();
    }

    // Attempt to detect and fallback to `sendmail`
    return this.detectSendmail().then(function (binpath) {
        self.transport = nodemailer.createTransport('sendmail', {
            path: binpath
        });
        self.usingSendmail();
    }, function () {
        self.emailDisabled();
    }).ensure(function () {
        return when.resolve();
    });
};

GhostMailer.prototype.isWindows = function () {
    return process.platform === 'win32';
};

GhostMailer.prototype.detectSendmail = function () {
    if (this.isWindows()) {
        return when.reject();
    }
    return when.promise(function (resolve, reject) {
        cp.exec('which sendmail', function (err, stdout) {
            if (err && !/bin\/sendmail/.test(stdout)) {
                return reject();
            }
            resolve(stdout.toString());
        });
    });
};

GhostMailer.prototype.createTransport = function (config) {
    this.transport = nodemailer.createTransport(config.mail.transport, _.clone(config.mail.options));
};

GhostMailer.prototype.usingSendmail = function () {
    this.api.notifications.add({
        type: 'info',
        message: [
            "Ghost is attempting to use your server's <b>sendmail</b> to send e-mail.",
            "It is recommended that you explicitly configure an e-mail service,",
            "See <a href=\"http://docs.ghost.org/mail\">http://docs.ghost.org/mail</a> for instructions"
        ].join(' '),
        status: 'persistent',
        id: 'ghost-mail-fallback'
    });
};

GhostMailer.prototype.emailDisabled = function () {
    this.api.notifications.add({
        type: 'warn',
        message: [
            "Ghost is currently unable to send e-mail.",
            "See <a href=\"http://docs.ghost.org/mail\">http://docs.ghost.org/mail</a> for instructions"
        ].join(' '),
        status: 'persistent',
        id: 'ghost-mail-disabled'
    });
    this.transport = null;
};

// Sends an e-mail message enforcing `to` (blog owner) and `from` fields
GhostMailer.prototype.send = function (message) {
    if (!this.transport) {
        return when.reject(new Error('Email Error: No e-mail transport configured.'));
    }
    if (!(message && message.subject && message.html)) {
        return when.reject(new Error('Email Error: Incomplete message data.'));
    }

    var from = 'ghost-mailer@' + url.parse(this.ghost.config().url).hostname,
        to = message.to || this.ghost.settings('email'),
        sendMail = nodefn.lift(this.transport.sendMail.bind(this.transport));

    message = _.extend(message, {
        from: from,
        to: to,
        generateTextFromHTML: true
    });

    return sendMail(message).otherwise(function (error) {
        // Proxy the error message so we can add 'Email Error:' to the beginning to make it clearer.
        error =  _.isString(error) ? 'Email Error:' + error : (_.isObject(error) ? 'Email Error: ' + error.message : 'Email Error: Unknown Email Error');
        return when.reject(new Error(error));
    });
};

module.exports = GhostMailer;
