var Mailgun = require('mailgun-js'),
    lodash = require('lodash'),
    errors = require('../errors');

/**
 * tag
 * - when you send your first mail with a tag, tag gets automatically created
 * - when you fetch stats before sending one email, an error will show up
 */
var GhostMailgun = function (options) {
    this.apiKey = options.apiKey;
    this.domain = options.domain;
    this.client = new Mailgun({apiKey: this.apiKey, domain: this.domain});
};

/**
 * send batch to mailgun (max is 1k per request)
 * https://documentation.mailgun.com/user_manual.html#batch-sending
 *
 * tag: identifies the blog and the newsletter
 */
GhostMailgun.prototype.send = function (options, done) {
    var to = lodash.cloneDeep(options.to),
        self = this,
        tag = options.tag,
        mailgunIds = [];

    if (!to || !lodash.isArray(to) || !to.length || !to[0].hasOwnProperty('email') || !to[0].hasOwnProperty('id')) {
        return done(new errors.ValidationError('GhostMailgun: property `to` is invalid'));
    }

    if (lodash.isEmpty(tag)) {
        return done(new errors.ValidationError('GhostMailgun: tag is required'));
    }

    var sendBatch = function (options, batchDone) {
        var to = options.to,
            from = options.from,
            subject = options.subject,
            html = options.html || '',
            text = options.text || '',
            toFlatArray = [],
            recipientVariables = {};

        lodash.each(to, function (recipient) {
            recipientVariables[recipient.email] = {unique_id: recipient.id};
        });

        lodash.each(to, function (recipient) {
            toFlatArray.push(recipient.email);
        });

        self.client.messages().send({
            from: from,
            to: toFlatArray,
            subject: subject,
            text: text,
            html: html,
            'recipient-variables': recipientVariables,
            'o:tracking': true,
            'o:tracking-clicks': true,
            'o:tracking-opens': true,
            'o:tag': tag
        }, batchDone);
    };

    var start = function () {
        options.to = to.slice(0, 500);
        to = to.splice(500);

        if (!options.to.length) {
            return done(null, {ids: mailgunIds});
        }

        sendBatch(options, function (err, response) {
            if (err) {
                return done(err);
            }

            mailgunIds.push(response.id);
            start();
        });
    };

    start();
};

/**
 * Mailgun returns for each day one entry
 * The first time the user sends a newsletter, the tag is created automatically
 *
 * [
 *   { time: Date, delivered: { total: Number }, clicked: { total: Number }},
 *   { time: Date, delivered: { total: Number }, clicked: { total: Number }},
 * ]
 *
 * https://documentation.mailgun.com/api-stats.html
 */
GhostMailgun.prototype.fetchStats = function (options, done) {
    var tag = options.tag;

    if (lodash.isEmpty(tag)) {
        return done(new errors.ValidationError('GhostMailgun: tag is required'));
    }

    this.client.get('/' + this.domain + '/tags/' + tag + '/stats', {
        event: ['opened', 'delivered', 'unsubscribed', 'clicked'],
        duration: '1d'
    }, function (err, res) {
        if (err) {
            // CASE: tag not found
            if (err.statusCode !== 404) {
                return done(err);
            }
        }

        done(null, res.stats ? res.stats : {});
    });
};

/**
 * we are able to fetch 30 days data from the events API
 * we can receive data like "who were the recipients of my newsletter"
 * https://documentation.mailgun.com/api-events.html
 *
 * {
 *   items: {
 *     [{ message:[Object], recipient: String, event: String }]
 *   }
 * }
 */
GhostMailgun.prototype.fetchEvents = function (options, done) {
    var tag = options.tag;

    if (lodash.isEmpty(tag)) {
        return done(new errors.ValidationError('GhostMailgun: tag is required'));
    }

    this.client.get('/' + this.domain + '/events', {
        limit: 100,
        tags: [tag]
    }, function (err, res) {
        if (err) {
            // CASE: tag not found
            if (err.statusCode !== 404) {
                return done(err);
            }
        }

        done(null, res.items ? res.items : {});
    });
};

module.exports = GhostMailgun;
