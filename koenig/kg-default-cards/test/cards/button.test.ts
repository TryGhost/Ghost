import card from '../../src/cards/button.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('Button card', function () {
    describe('front-end render', function () {
        it('generates an anchor element with card wrapper element', function () {
            const opts = {
                env: {dom: new SimpleDomDocument()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!'
                }
            };

            expect(serializer.serialize(card.render(opts))).toBe('<div class="kg-card kg-button-card kg-align-left"><a href="https://ghost.org/" class="kg-btn kg-btn-accent">Click me!</a></div>');
        });

        it('adds center classes when center aligned', function () {
            const opts = {
                env: {dom: new SimpleDomDocument()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!',
                    alignment: 'center'
                }
            };

            expect(serializer.serialize(card.render(opts))).toBe('<div class="kg-card kg-button-card kg-align-center"><a href="https://ghost.org/" class="kg-btn kg-btn-accent">Click me!</a></div>');
        });
    });

    describe('email render', function () {
        it('generates an email-friendly button in a paragraph', function () {
            const opts = {
                env: {dom: new SimpleDomDocument()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!'
                },
                options: {
                    target: 'email'
                }
            };

            expect(serializer.serialize(card.render(opts))).toBe('<p><div class="btn btn-accent"><table border="0" cellspacing="0" cellpadding="0" align="left"><tr><td align="center"><a href="https://ghost.org/">Click me!</a></td></tr></table></div></p>');
        });

        it('handles center alignment', function () {
            const opts = {
                env: {dom: new SimpleDomDocument()},
                payload: {
                    buttonUrl: 'https://ghost.org/',
                    buttonText: 'Click me!',
                    alignment: 'center'
                },
                options: {
                    target: 'email'
                }
            };

            expect(serializer.serialize(card.render(opts))).toBe('<p><div class="btn btn-accent"><table border="0" cellspacing="0" cellpadding="0" align="center"><tr><td align="center"><a href="https://ghost.org/">Click me!</a></td></tr></table></div></p>');
        });
    });

    it('renders nothing if buttonUrl is missing', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {
                buttonUrl: '',
                buttonText: 'Click me!'
            }
        };

        expect(serializer.serialize(card.render(opts))).toBe('');
    });

    it('renders nothing if buttonText is missing', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {
                buttonUrl: 'https://ghost.org/',
                buttonText: ''
            }
        };

        expect(serializer.serialize(card.render(opts))).toBe('');
    });

    it('transforms button url absolute to relative', function () {
        const payload = {
            buttonUrl: 'https://ghost.org/',
            buttonText: 'Testing'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'https://ghost.org'});

        expect((transformed.buttonUrl as string)).toBe('/');
    });

    it('transforms button url relative to absolute', function () {
        const payload = {
            buttonUrl: '/#/portal/signup',
            buttonText: 'Testing'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'https://ghost.org'});

        expect((transformed.buttonUrl as string)).toBe('https://ghost.org/#/portal/signup');
    });

    it('transforms button url to transform ready', function () {
        const payload = {
            buttonUrl: '/#/portal/signup',
            buttonText: 'Testing'
        };

        const transformed = card.toTransformReady!(payload, {siteUrl: 'https://ghost.org'});

        expect((transformed.buttonUrl as string)).toBe('__GHOST_URL__/#/portal/signup');
    });
});
