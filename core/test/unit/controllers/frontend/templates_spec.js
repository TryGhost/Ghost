/*globals describe, it, afterEach, beforeEach*/
var should   = require('should'),
    rewire   = require('rewire'),

// Stuff we are testing
    templates = rewire('../../../../server/controllers/frontend/templates'),

    configUtils = require('../../../utils/configUtils');

describe('templates', function () {
    afterEach(function () {
        configUtils.restore();
    });

    describe('utils', function () {
        var channelTemplateList = templates.__get__('getChannelTemplateHierarchy');

        it('should return just index for empty channelOpts', function () {
            channelTemplateList({}).should.eql(['index']);
        });

        it('should return just index if channel name is index', function () {
            channelTemplateList({name: 'index'}).should.eql(['index']);
        });

        it('should return just index if channel name is index even if slug is set', function () {
            channelTemplateList({name: 'index', slugTemplate: true, slugParam: 'test'}).should.eql(['index']);
        });

        it('should return channel, index if channel has name', function () {
            channelTemplateList({name: 'tag'}).should.eql(['tag', 'index']);
        });

        it('should return channel-slug, channel, index if channel has name & slug + slugTemplate set', function () {
            channelTemplateList({name: 'tag', slugTemplate: true, slugParam: 'test'}).should.eql(['tag-test', 'tag', 'index']);
        });

        it('should return front, channel-slug, channel, index if name, slugParam+slugTemplate & frontPageTemplate+pageParam=1 is set', function () {
            channelTemplateList({
                name: 'tag', slugTemplate: true, slugParam: 'test', frontPageTemplate: 'front-tag', postOptions: {page: 1}
            }).should.eql(['front-tag', 'tag-test', 'tag', 'index']);
        });

        it('should return home, index for index channel if front is set and pageParam = 1', function () {
            channelTemplateList({name: 'index', frontPageTemplate: 'home', postOptions: {page: 1}}).should.eql(['home', 'index']);
        });
    });

    describe('single', function () {
        describe('with many templates', function () {
            beforeEach(function () {
                configUtils.set({
                    paths: {
                        availableThemes: {
                            casper: {
                                assets: null,
                                'default.hbs': '/content/themes/casper/default.hbs',
                                'index.hbs': '/content/themes/casper/index.hbs',
                                'page.hbs': '/content/themes/casper/page.hbs',
                                'page-about.hbs': '/content/themes/casper/page-about.hbs',
                                'post.hbs': '/content/themes/casper/post.hbs',
                                'post-welcome-to-ghost.hbs': '/content/themes/casper/post-welcome-to-ghost.hbs'
                            }
                        }
                    }
                });
            });

            it('will return correct template for a post WITHOUT custom template', function () {
                var view = templates.single('casper', {
                    page: 0,
                    slug: 'test-post'
                });
                should.exist(view);
                view.should.eql('post');
            });

            it('will return correct template for a post WITH custom template', function () {
                var view = templates.single('casper', {
                    page: 0,
                    slug: 'welcome-to-ghost'
                });
                should.exist(view);
                view.should.eql('post-welcome-to-ghost', 'post');
            });

            it('will return correct template for a page WITHOUT custom template', function () {
                var view = templates.single('casper', {
                    page: 1,
                    slug: 'contact'
                });
                should.exist(view);
                view.should.eql('page');
            });

            it('will return correct template for a page WITH custom template', function () {
                var view = templates.single('casper', {
                    page: 1,
                    slug: 'about'
                });
                should.exist(view);
                view.should.eql('page-about');
            });
        });

        it('will fall back to post even if no index.hbs', function () {
            configUtils.set({paths: {availableThemes: {casper: {
                assets: null,
                'default.hbs': '/content/themes/casper/default.hbs'
            }}}});

            var view = templates.single('casper', {page: 1});
            should.exist(view);
            view.should.eql('post');
        });
    });

    describe('channel', function () {
        describe('without tag templates', function () {
            beforeEach(function () {
                configUtils.set({paths: {availableThemes: {casper: {
                    assets: null,
                    'default.hbs': '/content/themes/casper/default.hbs',
                    'index.hbs': '/content/themes/casper/index.hbs'
                }}}});
            });

            it('will return correct view for a tag', function () {
                var view = templates.channel('casper', {name: 'tag', slugParam: 'development', slugTemplate: true});
                should.exist(view);
                view.should.eql('index');
            });
        });

        describe('with tag templates', function () {
            beforeEach(function () {
                configUtils.set({paths: {availableThemes: {casper: {
                    assets: null,
                    'default.hbs': '/content/themes/casper/default.hbs',
                    'index.hbs': '/content/themes/casper/index.hbs',
                    'tag.hbs': '/content/themes/casper/tag.hbs',
                    'tag-design.hbs': '/content/themes/casper/tag-about.hbs'
                }}}});
            });

            it('will return correct view for a tag', function () {
                var view = templates.channel('casper', {name: 'tag', slugParam: 'design', slugTemplate: true});
                should.exist(view);
                view.should.eql('tag-design');
            });

            it('will return correct view for a tag', function () {
                var view = templates.channel('casper', {name: 'tag', slugParam: 'development', slugTemplate: true});
                should.exist(view);
                view.should.eql('tag');
            });
        });

        it('will fall back to index even if no index.hbs', function () {
            configUtils.set({paths: {availableThemes: {casper: {
                assets: null,
                'default.hbs': '/content/themes/casper/default.hbs'
            }}}});

            var view = templates.channel('casper', {name: 'tag', slugParam: 'development', slugTemplate: true});
            should.exist(view);
            view.should.eql('index');
        });
    });
});
