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
            "see <a href=\"https://github.com/TryGhost/Ghost/wiki/\">instructions in the wiki</a>."
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
            "See <a href=\"https://github.com/TryGhost/Ghost/wiki/\">instructions for configuring",
            "an e-mail service</a>."
        ].join(' '),
        status: 'persistent',
        id: 'ghost-mail-disabled'
    });
    this.transport = null;
};

// Sends an e-mail message enforcing `to` (blog owner) and `from` fields
GhostMailer.prototype.send = function (message) {
    if (!this.transport) {
        return when.reject(new Error('No e-mail transport configured.'));
    }
    if (!(message && message.subject && message.html)) {
        return when.reject(new Error('Incomplete message data.'));
    }

    var settings = this.ghost.settings(),
        from = 'ghost-mailer@' + url.parse(settings.url).hostname,
        to = settings.email,
        sendMail = nodefn.lift(this.transport.sendMail.bind(this.transport));

    message = _.extend(message, {
        from: from,
        to: to,
        generateTextFromHTML: true
    });

    return sendMail(message);
};

GhostMailer.prototype.sendWelcomeMessage = function () {
    var adminURL = this.ghost.settings().url + "/ghost";

    return this.send({
        subject: "Welcome to Ghost",
        html: "<p><strong>Hello!</strong></p>" +
            "<p>Welcome to the Ghost platform.</p>" +
            "<p>Your dashboard is ready at <a href=\"" + adminURL + "\">" + adminURL + "</a>"
    });
};

module.exports = GhostMailer;
