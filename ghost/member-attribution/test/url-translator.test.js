// Switch these lines once there are useful utils
// const testUtils = require('./utils');
require('./utils');
const UrlTranslator = require('../lib/url-translator');

describe('UrlTranslator', function () {
    describe('Constructor', function () {
        it('doesn\'t throw', function () {
            new UrlTranslator({});
        });
    });

    describe('getTypeAndId', function () {
        let translator;
        before(function () {
            translator = new UrlTranslator({
                urlService: {
                    getResource: (path) => {
                        switch (path) {
                        case '/post': return {
                            config: {type: 'posts'},
                            data: {id: 'post'}
                        };
                        case '/tag': return {
                            config: {type: 'tags'},
                            data: {id: 'tag'}
                        };
                        case '/page': return {
                            config: {type: 'pages'},
                            data: {id: 'page'}
                        };
                        case '/author': return {
                            config: {type: 'authors'},
                            data: {id: 'author'}
                        };
                        }
                    }
                }
            });
        });

        it('returns posts', function () {
            should(translator.getTypeAndId('/post')).eql({
                type: 'post',
                id: 'post'
            });
        });

        it('returns pages', function () {
            should(translator.getTypeAndId('/page')).eql({
                type: 'page',
                id: 'page'
            });
        });

        it('returns authors', function () {
            should(translator.getTypeAndId('/author')).eql({
                type: 'author',
                id: 'author'
            });
        });

        it('returns tags', function () {
            should(translator.getTypeAndId('/tag')).eql({
                type: 'tag',
                id: 'tag'
            });
        });

        it('returns undefined', function () {
            should(translator.getTypeAndId('/other')).eql(undefined);
        });
    });
});
