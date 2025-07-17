const should = require('should');
const sinon = require('sinon');
const testUtils = require('../../../utils');
const urlService = require('../../../../core/server/services/url');
const models = require('../../../../core/server/models');
const tagsHelper = require('../../../../core/frontend/helpers/tags');

describe('{{tags}} helper with wrapHtml turned On', function () {
    before(function () {
        models.init();
    });

    beforeEach(function () {
        sinon.stub(urlService, 'getUrlByResourceId');
    });

    afterEach(function () {
        sinon.restore();
    });

    const wrapSpan = (tagText, spanClass) => `<span class="${spanClass}">${tagText}</span>`;
    const wrapTagLink = (tagText, tagLink) => `<a class="post-tag" href="${tagLink}">${tagText}</a>`;

    const wrapTag = tagText => wrapSpan(tagText, 'post-tag');
    const wrapSeparator = separator => wrapSpan(separator, 'post-tag-separator');
    const wrapPrefix = prefix => wrapSpan(prefix, 'post-tag-prefix');
    const wrapSuffix = suffix => wrapSpan(suffix, 'post-tag-suffix');

    it('can return string with tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {autolink: 'false', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapTag('foo') +
            wrapSeparator(', ') +
            wrapTag('bar')
        );
    });

    it('can use a different separator', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {separator: '|', autolink: 'false', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapTag('haunted') +
            wrapSeparator('|') +
            wrapTag('ghost')
        );
    });

    it('can add a single prefix to multiple tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {prefix: 'on ', autolink: 'false', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapPrefix('on ') +
            wrapTag('haunted') +
            wrapSeparator(', ') +
            wrapTag('ghost')
        );
    });

    it('can add a single suffix to multiple tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {suffix: ' forever', autolink: 'false', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapTag('haunted') +
            wrapSeparator(', ') +
            wrapTag('ghost') +
            wrapSuffix(' forever')
        );
    });

    it('can add a prefix and suffix to multiple tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {suffix: ' forever', prefix: 'on ', autolink: 'false', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapPrefix('on ') +
            wrapTag('haunted') +
            wrapSeparator(', ') +
            wrapTag('ghost') +
            wrapSuffix(' forever')
        );
    });

    it('can add a prefix and suffix with HTML', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'haunted'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'ghost'})
        ];

        const rendered = tagsHelper.call({tags: tags}, {hash: {suffix: ' &bull;', prefix: '&hellip; ', autolink: 'false', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapPrefix('&hellip; ') +
            wrapTag('haunted') +
            wrapSeparator(', ') +
            wrapTag('ghost') +
            wrapSuffix(' &bull;')
        );
    });

    it('does not add prefix or suffix if no tags exist', function () {
        const rendered = tagsHelper.call({}, {hash: {prefix: 'on ', suffix: ' forever', autolink: 'false', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal('');
    });

    it('can autolink tags to tag pages', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(tags[0].id).returns('tag url 1');
        urlService.getUrlByResourceId.withArgs(tags[1].id).returns('tag url 2');

        const rendered = tagsHelper.call({tags: tags}, {hash: {wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapTagLink('foo', 'tag url 1') +
            wrapSeparator(', ') +
            wrapTagLink('bar', 'tag url 2')
        );
    });

    it('can limit no. tags output to 1', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(tags[0].id).returns('tag url 1');

        const rendered = tagsHelper.call({tags: tags}, {hash: {limit: '1', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(wrapTagLink('foo', 'tag url 1'));
    });

    it('can list tags from a specified no.', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(tags[1].id).returns('tag url 2');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(wrapTagLink('bar', 'tag url 2'));
    });

    it('can list tags to a specified no.', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'})
        ];

        urlService.getUrlByResourceId.withArgs(tags[0].id).returns('tag url x');

        const rendered = tagsHelper.call({tags: tags}, {hash: {to: '1', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(wrapTagLink('foo', 'tag url x'));
    });

    it('can list tags in a range', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'})
        ];

        urlService.getUrlByResourceId.withArgs(tags[1].id).returns('tag url b');
        urlService.getUrlByResourceId.withArgs(tags[2].id).returns('tag url c');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2', to: '3', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapTagLink('bar', 'tag url b') +
            wrapSeparator(', ') +
            wrapTagLink('baz', 'tag url c')
        );
    });

    it('can limit no. tags and output from 2', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'})
        ];

        urlService.getUrlByResourceId.withArgs(tags[1].id).returns('tag url b');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2', limit: '1', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(wrapTagLink('bar', 'tag url b'));
    });

    it('can list tags in a range (ignore limit)', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'})
        ];

        urlService.getUrlByResourceId.withArgs(tags[0].id).returns('tag url a');
        urlService.getUrlByResourceId.withArgs(tags[1].id).returns('tag url b');
        urlService.getUrlByResourceId.withArgs(tags[2].id).returns('tag url c');

        const rendered = tagsHelper.call({tags: tags}, {hash: {from: '1', to: '3', limit: '2', wrapHtml: 'true'}});
        should.exist(rendered);

        String(rendered).should.equal(
            wrapTagLink('foo', 'tag url a') +
            wrapSeparator(', ') +
            wrapTagLink('bar', 'tag url b') +
            wrapSeparator(', ') +
            wrapTagLink('baz', 'tag url c')
        );
    });

    describe('Internal tags', function () {
        const tags = [
            testUtils.DataGenerator.forKnex.createTag({name: 'foo', slug: 'foo-bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: '#bar', slug: 'hash-bar', visibility: 'internal'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'bar', slug: 'bar'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'baz', slug: 'baz'}),
            testUtils.DataGenerator.forKnex.createTag({name: 'buzz', slug: 'buzz'})
        ];

        const tags1 = [
            testUtils.DataGenerator.forKnex.createTag({name: '#foo', slug: 'hash-foo-bar', visibility: 'internal'}),
            testUtils.DataGenerator.forKnex.createTag({name: '#bar', slug: 'hash-bar', visibility: 'internal'})
        ];

        beforeEach(function () {
            urlService.getUrlByResourceId.withArgs(tags[0].id).returns('1');
            urlService.getUrlByResourceId.withArgs(tags[1].id).returns('2');
            urlService.getUrlByResourceId.withArgs(tags[2].id).returns('3');
            urlService.getUrlByResourceId.withArgs(tags[3].id).returns('4');
            urlService.getUrlByResourceId.withArgs(tags[4].id).returns('5');
        });

        it('will not output internal tags by default', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {wrapHtml: 'true'}});

            String(rendered).should.equal(
                wrapTagLink('foo', '1') +
                wrapSeparator(', ') +
                wrapTagLink('bar', '3') +
                wrapSeparator(', ') +
                wrapTagLink('baz', '4') +
                wrapSeparator(', ') +
                wrapTagLink('buzz', '5')
            );
        });

        it('should still correctly apply from & limit tags', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {from: '2', limit: '2', wrapHtml: 'true'}});

            String(rendered).should.equal(
                wrapTagLink('bar', '3') +
                wrapSeparator(', ') +
                wrapTagLink('baz', '4')
            );
        });

        it('should output all tags with visibility="all"', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {visibility: 'all', wrapHtml: 'true'}});

            String(rendered).should.equal(
                wrapTagLink('foo', '1') +
                wrapSeparator(', ') +
                wrapTagLink('#bar', '2') +
                wrapSeparator(', ') +
                wrapTagLink('bar', '3') +
                wrapSeparator(', ') +
                wrapTagLink('baz', '4') +
                wrapSeparator(', ') +
                wrapTagLink('buzz', '5')
            );
        });

        it('should output all tags with visibility property set with visibility="public,internal"', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {visibility: 'public,internal', wrapHtml: 'true'}});
            should.exist(rendered);

            String(rendered).should.equal(
                wrapTagLink('foo', '1') +
                wrapSeparator(', ') +
                wrapTagLink('#bar', '2') +
                wrapSeparator(', ') +
                wrapTagLink('bar', '3') +
                wrapSeparator(', ') +
                wrapTagLink('baz', '4') +
                wrapSeparator(', ') +
                wrapTagLink('buzz', '5')
            );
        });

        it('Should output only internal tags with visibility="internal"', function () {
            const rendered = tagsHelper.call({tags: tags}, {hash: {visibility: 'internal', wrapHtml: 'true'}});
            should.exist(rendered);

            String(rendered).should.equal(wrapTagLink('#bar', '2'));
        });

        it('should output nothing if all tags are internal', function () {
            const rendered = tagsHelper.call({tags: tags1}, {hash: {prefix: 'stuff', wrapHtml: 'true'}});
            should.exist(rendered);

            String(rendered).should.equal('');
        });
    });
});
