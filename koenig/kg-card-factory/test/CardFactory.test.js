// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');

const CardFactory = require('../');
const SimpleDom = require('simple-dom');
const serializer = new SimpleDom.HTMLSerializer(SimpleDom.voidMap);

describe('CardFactory', function () {
    describe('render', function () {
        it('adds comment wrapper when configured', function () {
            let cardDefinition = {
                name: 'test',
                type: 'dom',
                config: {
                    commentWrapper: true
                },
                render({env: {dom}}) {
                    let div = dom.createElement('div');
                    div.appendChild(dom.createTextNode('Test!'));
                    return div;
                }
            };
            let factory = new CardFactory();
            let card = factory.createCard(cardDefinition);

            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                }
            };

            serializer.serialize(card.render(opts))
                .should.eql('<!--kg-card-begin: test--><div>Test!</div><!--kg-card-end: test-->');
        });

        it('skips comment wrapper if card output is blank', function () {
            let cardDefinition = {
                name: 'test',
                type: 'dom',
                config: {
                    commentWrapper: true
                },
                render({env: {dom}}) {
                    return dom.createTextNode('');
                }
            };
            let factory = new CardFactory();
            let card = factory.createCard(cardDefinition);

            let opts = {
                env: {
                    dom: new SimpleDom.Document()
                }
            };

            serializer.serialize(card.render(opts)).should.eql('');
        });
    });

    describe('absoluteToRelative', function () {
        it('passes siteUrl in from factory options', function () {
            let cardDefinition = {
                absoluteToRelative(payload, options) {
                    return options.siteUrl;
                }
            };
            let factory = new CardFactory({siteUrl: 'http://127.0.0.1:2368/'});
            let card = factory.createCard(cardDefinition);

            card.absoluteToRelative().should.equal('http://127.0.0.1:2368/');
        });
    });

    describe('relativeToAbsolute', function () {
        it('passes siteUrl in from factory options', function () {
            let cardDefinition = {
                relativeToAbsolute(payload, options) {
                    return options.siteUrl;
                }
            };
            let factory = new CardFactory({siteUrl: 'http://127.0.0.1:2368/'});
            let card = factory.createCard(cardDefinition);

            card.relativeToAbsolute().should.equal('http://127.0.0.1:2368/');
        });
    });
});
