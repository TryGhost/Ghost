// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/button');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Button card', function () {
    describe('front-end render', function () {
        it('generates an anchor element with card wrapper element', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!'
                }
            };

            serializer.serialize(card.render(opts)).should.equal('<div class="kg-card kg-button-card kg-align-left"><a href="https://ghost.org/" class="kg-btn kg-btn-accent">Click me!</a></div>');
        });

        it('adds center classes when center aligned', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!',
                    alignment: 'center'
                }
            };

            serializer.serialize(card.render(opts)).should.equal('<div class="kg-card kg-button-card kg-align-center"><a href="https://ghost.org/" class="kg-btn kg-btn-accent">Click me!</a></div>');
        });
    });

    describe('email render', function () {
        it('generates an email-friendly button in a paragraph', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!'
                },
                options: {
                    target: 'email'
                }
            };

            serializer.serialize(card.render(opts)).should.equal('<p><div class="btn btn-accent"><table border="0" cellspacing="0" cellpadding="0" align="left"><tr><td align="center"><a href="https://ghost.org/">Click me!</a></td></tr></table></div></p>');
        });

        it('handles center alignment', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!',
                    alignment: 'center'
                },
                options: {
                    target: 'email'
                }
            };

            serializer.serialize(card.render(opts)).should.equal('<p><div class="btn btn-accent"><table border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center"><a href="https://ghost.org/">Click me!</a></td></tr></table></div></p>');
        });
    });

    it('renders nothing if buttonUrl is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                buttonUrl: '',
                buttonText: 'Click me!'
            }
        };

        serializer.serialize(card.render(opts)).should.equal('');
    });

    it('renders nothing if buttonText is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                buttonUrl: 'https://ghost.org/',
                buttonText: ''
            }
        };

        serializer.serialize(card.render(opts)).should.equal('');
    });

    it('transforms button url absolute to relative', function () {
        let payload = {
            buttonUrl: 'https://ghost.org/',
            buttonText: 'Testing'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'https://ghost.org'});

        transformed.buttonUrl.should.equal('/');
    });

    it('transforms button url relative to absolute', function () {
        let payload = {
            buttonUrl: '/#/portal/signup',
            buttonText: 'Testing'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'https://ghost.org'});

        transformed.buttonUrl.should.equal('https://ghost.org/#/portal/signup');
    });

    it('transforms button url to transform ready', function () {
        let payload = {
            buttonUrl: '/#/portal/signup',
            buttonText: 'Testing'
        };

        const transformed = card.toTransformReady(payload, {siteUrl: 'https://ghost.org'});

        transformed.buttonUrl.should.equal('__GHOST_URL__/#/portal/signup');
    });
});
