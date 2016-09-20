var sinon = require('sinon'),
    mail = require('../../../server/mail'),
    sandbox = sinon.sandbox.create();

describe('Mail: Utils', function () {
    var scope = {ghostMailer: null};

    beforeEach(function () {
        scope.ghostMailer = new mail.GhostMailer();

        sandbox.stub(scope.ghostMailer.transport, 'sendMail', function (message, sendMailDone) {
            sendMailDone(null, {
                statusHandler: {
                    once: function (eventName, eventDone) {
                        if (eventName === 'sent') {
                            eventDone();
                        }
                    }
                }
            });
        });
    });

    afterEach(function () {
        sandbox.restore();
    });

    it('generate welcome', function (done) {
        mail.utils.generateContent({
            template: 'welcome',
            data: {
                ownerEmail: 'kate@ghost.org'
            }
        }).then(function (result) {
            return scope.ghostMailer.send({
                to: 'kate@ghost.org',
                subject: 'lol',
                html: result.html,
                text: result.text
            });
        }).then(function () {
            done();
        }).catch(done);
    });

    it('generates newsletter template', function (done) {
        mail.utils.generateContent({
            template: 'newsletter',
            data: {
                blog: {
                    logo: 'http://myblog.com/content/images/blog-logo.jpg',
                    title: 'The Ghost Blog',
                    url: 'http://myblog.com',
                    twitterUrl: 'http://twitter.com/tryghost',
                    facebookUrl: 'https://www.facebook.com/ghost',
                    unsubscribe: 'http://myblog.com/unsubscribe',
                    post: [
                        {
                            picture: 'http://myblog.com/content/images/post-1-image.jpg',
                            title: 'Featured blog post',
                            text: 'This is a featured blog post. It&#x2019;s awesome&#x2026;',
                            url: 'http://myblog.com/featured-blog-post',
                            tag: 'featured',
                            author: 'harry potter'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-2-image.jpg',
                            title: 'Second blog post',
                            text: 'This is the second blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/second-blog-post',
                            tag: 'second',
                            author: 'lord voldemord'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-3-image.jpg',
                            title: 'Third blog post',
                            text: 'This is the third blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/third-blog-post',
                            tag: 'third',
                            author: 'marry poppins'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-4-image.jpg',
                            title: 'Fourth blog post',
                            text: 'This is the fourth blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/fourth-blog-post',
                            tag: 'fourth',
                            author: 'donald duck'
                        },
                        {
                            picture: 'http://myblog.com/content/images/post-5-image.jpg',
                            title: 'Fifth blog post',
                            text: 'This is the fifth blog post. It&#x2019;s also awesome&#x2026;',
                            url: 'http://myblog.com/fifth-blog-post',
                            tag: 'fifth',
                            author: 'casper the ghost'
                        }
                    ]
                },
                newsletter: {
                    interval: 'monthly',
                    date: 'june, 9th 2016'
                }
            }
        }).then(function (result) {
            return scope.ghostMailer.send({
                to: 'aileen@ghost.org',
                subject: 'The Newsletter Blog',
                html: result.html,
                text: result.text
            });
        }).then(function () {
            done();
        }).catch(done);
    });
});
