import './utils/index.js';
import {CardFactory} from '../src/CardFactory.js';
import type {DomProvider} from '../src/CardFactory.js';
import {Document as SimpleDomDocument, HTMLSerializer, voidMap} from 'simple-dom';

const serializer = new HTMLSerializer(voidMap);

describe('CardFactory', function () {
    describe('render', function () {
        it('adds comment wrapper when configured', function () {
            const factory = new CardFactory();
            const card = factory.createCard({
                name: 'test',
                type: 'dom',
                config: {commentWrapper: true},
                render({env: {dom}}) {
                    const d = dom as DomProvider & InstanceType<typeof SimpleDomDocument>;
                    const div = d.createElement('div');
                    div.appendChild!(d.createTextNode('Test!'));
                    return div;
                }
            });

            const opts = {env: {dom: new SimpleDomDocument() as unknown as DomProvider}, payload: {}, options: {}};

            serializer.serialize(card.render(opts) as unknown as Parameters<typeof serializer.serialize>[0])
                .should.eql('<!--kg-card-begin: test--><div>Test!</div><!--kg-card-end: test-->');
        });

        it('skips comment wrapper if card output is blank', function () {
            const factory = new CardFactory();
            const card = factory.createCard({
                name: 'test',
                type: 'dom',
                config: {commentWrapper: true},
                render({env: {dom}}) {
                    const d = dom as DomProvider & InstanceType<typeof SimpleDomDocument>;
                    return d.createTextNode('');
                }
            });

            const opts = {env: {dom: new SimpleDomDocument() as unknown as DomProvider}, payload: {}, options: {}};

            serializer.serialize(card.render(opts) as unknown as Parameters<typeof serializer.serialize>[0]).should.eql('');
        });
    });

    describe('absoluteToRelative', function () {
        it('passes siteUrl in from factory options', function () {
            const factory = new CardFactory({siteUrl: 'http://127.0.0.1:2368/'});
            const card = factory.createCard({
                name: 'test',
                type: 'dom',
                render() {
                    return {};
                },
                absoluteToRelative(_payload, options) {
                    return {receivedSiteUrl: options.siteUrl};
                }
            });

            card.absoluteToRelative({}).should.have.property('receivedSiteUrl', 'http://127.0.0.1:2368/');
        });
    });

    describe('relativeToAbsolute', function () {
        it('passes siteUrl in from factory options', function () {
            const factory = new CardFactory({siteUrl: 'http://127.0.0.1:2368/'});
            const card = factory.createCard({
                name: 'test',
                type: 'dom',
                render() {
                    return {};
                },
                relativeToAbsolute(_payload, options) {
                    return {receivedSiteUrl: options.siteUrl};
                }
            });

            card.relativeToAbsolute({}).should.have.property('receivedSiteUrl', 'http://127.0.0.1:2368/');
        });
    });
});
