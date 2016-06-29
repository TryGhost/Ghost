var config = require(__dirname + '/../config'),
    errors = require(config.paths.corePath + '/server/errors'),
    mail = require(config.paths.corePath + '/server/mail'),
    Promise = require('bluebird'),
    moment = require('moment'),
    newsletter;

newsletter = {
    sendTest: function (object) {
        var mailgun = new mail.GhostMailgun({
            apiKey: config.mail.options.auth.apiKey,
            domain: config.mail.options.auth.domain
        });

        if (!object.email) {
            return Promise.reject(new errors.ValidationError('email property missing'));
        }

        return mail.utils.generateContent({
            template: 'newsletter',
            data: {
                blog: {
                    title: config.theme.title,
                    logo: config.theme.logo,
                    url: config.getBaseUrl(),
                    // @TODO: replace me
                    unsubscribe: 'http://ghost.org/unsubscribe',
                    // @TODO: add more example posts
                    post: [
                        {
                            picture: 'https://pixabay.com/static/uploads/photo/2016/06/19/00/17/raspberry-1465988_960_720.jpg',
                            title: 'Fourth blog post',
                            text: 'This is the fourth blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/fourth-blog-post',
                            tag: 'fourth',
                            author: 'donald duck'
                        }
                    ]
                },
                newsletter: {
                    interval: 'monthly',
                    date: moment().format('MMMM Do YYYY')
                }
            }
        }).then(function (result) {
            return new Promise(function (resolve, reject) {
                mailgun.send({
                    title: 'Newsletter',
                    from: config.newsletterFromAddress || config.mail.from,
                    to: [{email: object.email, id: 1}],
                    text: result.text,
                    html: result.html
                }, function (err) {
                    if (err) {
                        return reject(err);
                    }

                    resolve();
                });
            });
        });
    }
};

module.exports = newsletter;
