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
        this.createTransport();
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
            resolve(stdout.toString().replace(/(\n|\r|\r\n)$/, ''));
        });
    });
};

GhostMailer.prototype.createTransport = function () {
    this.transport = nodemailer.createTransport(config().mail.transport, _.clone(config().mail.options));
};

GhostMailer.prototype.usingSendmail = function () {
    api.notifications.add({
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
    api.notifications.add({
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
    var self = this;

    if (!this.transport) {
        return when.reject(new Error('Email Error: No e-mail transport configured.'));
    }
    if (!(message && message.subject && message.html)) {
        return when.reject(new Error('Email Error: Incomplete message data.'));
    }

    return api.settings.read('email').then(function (email) {
        var from = (config().mail && config().mail.fromaddress) || email.value,
            to = message.to || email.value;

        message = _.extend(message, {
            from: from,
            to: to,
            generateTextFromHTML: true
        });
    }).then(function () {
        var sendMail = nodefn.lift(self.transport.sendMail.bind(self.transport));
        return sendMail(message);
    }).otherwise(function (error) {
        // Proxy the error message so we can add 'Email Error:' to the beginning to make it clearer.
        error =  _.isString(error) ? 'Email Error:' + error : (_.isObject(error) ? 'Email Error: ' + error.message : 'Email Error: Unknown Email Error');
        return when.reject(new Error(error));
    });
};

module.exports = new GhostMailer();
