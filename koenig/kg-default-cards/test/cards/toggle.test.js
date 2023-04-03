// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('../utils');

const card = require('../../lib/cards/toggle');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('Toggle card', function () {
    describe('front-end render', function () {
        it('renders the toggle nodes with card wrapper element', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    heading: 'This is toggle heading',
                    content: 'This is toggle content'
                }
            };

            serializer.serialize(card.render(opts)).should.equal('<div class="kg-card kg-toggle-card" data-kg-toggle-state="close"><div class="kg-toggle-heading"><h4 class="kg-toggle-heading-text">This is toggle heading</h4><button class="kg-toggle-card-icon"><svg id="Regular" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path class="cls-1" d="M23.25,7.311,12.53,18.03a.749.749,0,0,1-1.06,0L.75,7.311"/></svg></button></div><div class="kg-toggle-content">This is toggle content</div></div>');
        });
    });

    describe('email render', function () {
        it('generates an email-friendly toggle in a paragraph', function () {
            let opts = {
                env: {dom: new SimpleDom.Document()},
                payload: {
                    heading: 'This is toggle heading',
                    content: 'This is toggle content'
                },
                options: {
                    target: 'email'
                }
            };
            serializer.serialize(card.render(opts)).should.equal('<div class="kg-toggle-card"><h4 style="font-size: 1.375rem !important; font-weight: 600; margin-bottom: 8px; margin-top:0px">This is toggle heading</h4><div style="font-size: 1rem !important; line-height: 1.5; margin-bottom: -1.5em;">This is toggle content</div></div>');
        });
    });

    it('renders nothing if heading is missing', function () {
        let opts = {
            env: {dom: new SimpleDom.Document()},
            payload: {
                heading: '',
                content: 'This is toggle content'
            }
        };

        serializer.serialize(card.render(opts)).should.equal('');
    });

    it('transforms content urls absolute to relative', function () {
        let payload = {
            heading: 'This is toggle heading',
            content: '<a href="https://ghost.org/">Home</a>'
        };

        const transformed = card.absoluteToRelative(payload, {siteUrl: 'https://ghost.org'});

        transformed.content.should.equal('<a href="/">Home</a>');
    });

    it('transforms content urls relative to absolute', function () {
        let payload = {
            heading: 'This is toggle heading',
            content: '<a href="/#/portal/signup">Sign up</a>'
        };

        const transformed = card.relativeToAbsolute(payload, {siteUrl: 'https://ghost.org'});

        transformed.content.should.equal('<a href="https://ghost.org/#/portal/signup">Sign up</a>');
    });

    it('transforms content urls to transform ready', function () {
        let payload = {
            heading: 'This is toggle heading',
            content: '<a href="/#/portal/signup">Sign up</a>'
        };

        const transformed = card.toTransformReady(payload, {siteUrl: 'https://ghost.org'});

        transformed.content.should.equal('<a href="__GHOST_URL__/#/portal/signup">Sign up</a>');
    });
});
