import '../utils/index.js';

import card from '../../src/cards/callout.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';
const serializer = new HTMLSerializer(voidMap);

describe('Callout card', function () {
    describe('front-end render', function () {
        it('renders the callout nodes with card wrapper element', function () {
            const opts = {
                env: {dom: new SimpleDomDocument()},
                payload: {
                    calloutEmoji: '⚠️',
                    calloutText: 'This is a callout'
                }
            };

            serializer.serialize(card.render(opts)).should.equal('<div class="kg-card kg-callout-card kg-callout-card-"><div class="kg-callout-emoji">⚠️</div><div class="kg-callout-text">This is a callout</div></div>');
        });

        it('renders the callout nodes without the emoji element', function () {
            const opts = {
                env: {dom: new SimpleDomDocument()},
                payload: {
                    calloutEmoji: '',
                    calloutText: 'This is a callout'
                }
            };

            serializer.serialize(card.render(opts)).should.equal('<div class="kg-card kg-callout-card kg-callout-card-"><div class="kg-callout-text">This is a callout</div></div>');
        });
    });

    // TODO: proper email rendering
    // describe('email render', function () {
    //     it('generates an email-friendly callout in a paragraph', function () {
    //         let opts = {
    //             env: {dom: new SimpleDomDocument()},
    //             payload: {
    //                 calloutEmoji: '⚠️',
    //                 calloutText: 'This is a callout'
    //             },
    //             options: {
    //                 target: 'email'
    //             }
    //         };
    //         serializer.serialize(card.render(opts)).should.equal('');
    //     });
    // });

    it('renders nothing if calloutText is missing', function () {
        const opts = {
            env: {dom: new SimpleDomDocument()},
            payload: {
                calloutEmoji: '⚠️',
                calloutText: ''
            }
        };

        serializer.serialize(card.render(opts)).should.equal('');
    });

    it('transforms callout urls absolute to relative', function () {
        const payload = {
            calloutEmoji: '⚠️',
            calloutText: '<a href="https://ghost.org/">Home</a>'
        };

        const transformed = card.absoluteToRelative!(payload, {siteUrl: 'https://ghost.org'});

        (transformed.calloutText as string).should.equal('<a href="/">Home</a>');
    });

    it('transforms callout urls relative to absolute', function () {
        const payload = {
            calloutEmoji: '⚠️',
            calloutText: '<a href="/#/portal/signup">Sign up</a>'
        };

        const transformed = card.relativeToAbsolute!(payload, {siteUrl: 'https://ghost.org'});

        (transformed.calloutText as string).should.equal('<a href="https://ghost.org/#/portal/signup">Sign up</a>');
    });

    it('transforms callout urls to transform ready', function () {
        const payload = {
            calloutEmoji: '⚠️',
            calloutText: '<a href="/#/portal/signup">Sign up</a>'
        };

        const transformed = card.toTransformReady!(payload, {siteUrl: 'https://ghost.org'});

        (transformed.calloutText as string).should.equal('<a href="__GHOST_URL__/#/portal/signup">Sign up</a>');
    });
});
