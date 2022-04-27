const should = require('should');
const sinon = require('sinon');
const cheerio = require('cheerio');

const render = require('../../../../../core/server/services/mega/template');

describe('Mega template', function () {
    afterEach(function () {
        sinon.restore();
    });

    it('Renders html correctly', function () {
        const post = {
            title: 'My post title',
            excerpt: 'My post excerpt',
            url: 'post url',
            authors: 'post authors',
            published_at: 'post published_at',
            feature_image: 'post feature image',
            feature_image_caption: 'post feature image caption',
            feature_image_width: 'post feature image width',
            feature_image_alt: 'post feature image alt',
            html: '<div class="post-content-html"></div>'
        };
        const site = {
            iconUrl: 'site icon url',
            url: 'site url',
            title: 'site title'
        };
        const templateSettings = {
            headerImage: 'header image',
            headerImageWidth: '600',
            showHeaderIcon: true,
            showHeaderTitle: true,
            showHeaderName: true,
            titleAlignment: 'left',
            titleFontCategory: 'serif',
            showFeatureImage: true,
            bodyFontCategory: 'sans_serif',
            footerContent: 'footer content',
            showBadge: true
        };
        const newsletter = {
            name: 'newsletter name'
        };

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);

        should($('title').text()).eql(post.title);
        should($('.preheader').text()).eql(post.excerpt);
        should($('.header-image').length).eql(1);

        const headerImage = $('.header-image img');
        should(headerImage.length).eql(1);
        should(headerImage.attr('src')).eql(templateSettings.headerImage);
        should(headerImage.attr('width')).eql(templateSettings.headerImageWidth);
        should($('td.site-info-bordered').length).eql(1);
        should($('.site-info').length).eql(0);
        should($('.site-url').length).eql(2);
        should($('.site-icon').length).eql(1);
        should($('.site-icon a').attr('href')).eql(site.url);
        should($('.site-icon a img').attr('src')).eql(site.iconUrl);
        should($('.site-icon a img').attr('alt')).eql(site.title);
        should($('.site-title').length).eql(1);

        const headerTitle = $($('.site-url').first());
        should(headerTitle.length).eql(1);
        should(headerTitle.hasClass('site-url-bottom-padding')).eql(false);
        should(headerTitle.find('.site-title').attr('href')).eql(site.url);
        should(headerTitle.find('.site-title').text()).eql(site.title);

        const headerSubtitle = $($('.site-url').get()[1]);
        should(headerSubtitle.length).eql(1);
        should(headerSubtitle.hasClass('site-url-bottom-padding')).eql(true);
        should(headerSubtitle.find('.site-subtitle').attr('href')).eql(site.url);
        should(headerSubtitle.find('.site-subtitle').text()).eql(newsletter.name);

        const postTitle = $('.post-title');
        should(postTitle.length).eql(1);
        should(postTitle.hasClass('post-title-serif')).eql(true);
        should(postTitle.hasClass('post-title-left')).eql(true);
        should($('.post-title a').attr('href')).eql(post.url);
        should($('.post-title a').hasClass('post-title-link-left')).eql(true);
        should($('.post-title a').text()).eql(post.title);

        const postMeta = $('.post-meta');
        should(postMeta.length).eql(1);
        should(postMeta.hasClass('post-meta-left')).eql(true);
        should(postMeta.text().trim().replace(/ *\n */g, '\n')).eql(`By ${post.authors} –\n${post.published_at} –\nView online →`);
        should(postMeta.find('a').attr('href')).eql(post.url);

        const featureImage = $('.feature-image');
        should(featureImage.length).eql(1);
        should(featureImage.hasClass('feature-image-with-caption')).eql(true);
        should(featureImage.find('img').attr('src')).eql(post.feature_image);
        should(featureImage.find('img').attr('width')).eql(post.feature_image_width);
        should(featureImage.find('img').attr('alt')).eql(post.feature_image_alt);

        const imageCaption = $('.feature-image-caption');
        should(imageCaption.length).eql(1);

        should(imageCaption.text()).eql(post.feature_image_caption);

        should($('.post-content-sans-serif').length).eql(1);
        should($('.post-content').length).eql(0);

        should($('.post-content-html').length).eql(1);

        const footers = $('.footer').get();
        should(footers.length).eql(2);
        should($(footers[0]).text()).eql(templateSettings.footerContent);
        should($(footers[1]).text()).eql(`${site.title} © ${(new Date()).getFullYear()} – Unsubscribe`);
        should($(footers[1]).find('a').attr('href')).eql('%recipient.unsubscribe_url%');

        const footerPowered = $('.footer-powered');
        should(footerPowered.length).eql(1);
        should(footerPowered.find('a img').attr('alt')).eql('Powered by Ghost');
    });

    it('Uses the post title as a fallback for the excerpt', function () {
        const post = {
            title: 'My post title'
        };
        const site = {};
        const templateSettings = {};
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.preheader').text()).eql(post.title + ' – ');
    });

    it('Hides the header image if it isn\'t set', function () {
        const post = {};
        const site = {};
        const templateSettings = {
            headerImage: ''
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);

        should($('.header-image').length).eql(0);
    });

    it('Shows no width in the header if headerImageWidth isn\'t defined', function () {
        const post = {
            title: 'My post title'
        };
        const site = {};
        const templateSettings = {
            headerImage: 'header image'
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.header-image').length).eql(1);
        should($('.header-image img').length).eql(1);
        should(typeof $('.header-image img').attr('width')).eql('undefined');
    });

    it('Shows no header when all header features are disabled', function () {
        const post = {
            title: 'My post title'
        };
        const site = {};
        const templateSettings = {
            showHeaderIcon: false,
            showHeaderTitle: false,
            showHeaderName: false
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.site-info-bordered').length).eql(0);
        should($('.site-info').length).eql(0);
        should($('.site-url').length).eql(0);
        should($('.site-icon').length).eql(0);
        should($('.site-title').length).eql(0);
        should($('.site-subtitle').length).eql(0);
        should($('.site-url-bottom-padding').length).eql(0);
    });

    it('Shows the right header for showHeaderIcon:true, showHeaderTitle:false, showHeaderName:false', function () {
        /**
         * The edge case where the iconUrl is falsy in the current configuration wasn't tested.
         * The reason is that the Ghost admin is guarding against the edge case.
         */
        const post = {};
        const site = {
            iconUrl: 'site icon url'
        };
        const templateSettings = {
            showHeaderIcon: true,
            showHeaderTitle: false,
            showHeaderName: false
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.site-info-bordered').length).eql(0);
        should($('.site-info').length).eql(1);
        should($('.site-icon').length).eql(1);
        should($('.site-url').length).eql(0);
        should($('.site-title').length).eql(0);
        should($('.site-subtitle').length).eql(0);
    });

    it('Shows the right header for showHeaderIcon:false, showHeaderTitle:true, showHeaderName:false', function () {
        const post = {};
        const site = {
            title: 'site title'
        };
        const templateSettings = {
            showHeaderIcon: false,
            showHeaderTitle: true,
            showHeaderName: false
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.site-info-bordered').length).eql(1);
        should($('.site-info').length).eql(0);
        should($('.site-icon').length).eql(0);
        should($('.site-url').length).eql(1);
        should($('.site-url').hasClass('site-url-bottom-padding')).eql(true);
        should($('.site-url').text()).eql(site.title);
        should($('.site-title').length).eql(1);
        should($('.site-subtitle').length).eql(0);
    });

    it('Shows the right header for showHeaderIcon:false, showHeaderTitle:false, showHeaderName:true', function () {
        const post = {};
        const site = {};
        const templateSettings = {
            showHeaderIcon: false,
            showHeaderTitle: false,
            showHeaderName: true
        };
        const newsletter = {
            name: 'newsletter name'
        };

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.site-info-bordered').length).eql(0);
        should($('.site-info').length).eql(1);
        should($('.site-icon').length).eql(0);
        should($('.site-url').length).eql(1);
        should($('.site-url').hasClass('site-url-bottom-padding')).eql(true);
        should($('.site-url').text()).eql(newsletter.name);
        should($('.site-title').length).eql(1);
        should($('.site-subtitle').length).eql(0);
    });

    it('Shows the right header for showHeaderIcon:true, showHeaderTitle:true, showHeaderName:false', function () {
        const post = {};
        const site = {
            iconUrl: 'site icon url',
            title: 'site title'
        };
        const templateSettings = {
            showHeaderIcon: true,
            showHeaderTitle: true,
            showHeaderName: false
        };
        const newsletter = {
        };

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.site-info-bordered').length).eql(1);
        should($('.site-info').length).eql(0);
        should($('.site-icon').length).eql(1);
        should($('.site-url').length).eql(1);
        should($('.site-url').hasClass('site-url-bottom-padding')).eql(true);
        should($('.site-url').text()).eql(site.title);
        should($('.site-title').length).eql(1);
        should($('.site-subtitle').length).eql(0);
    });

    it('Shows the right header for showHeaderIcon:true, showHeaderTitle:false, showHeaderName:true', function () {
        const post = {};
        const site = {
            iconUrl: 'site icon url'
        };
        const templateSettings = {
            showHeaderIcon: true,
            showHeaderTitle: false,
            showHeaderName: true
        };
        const newsletter = {
            name: 'newsletter name'
        };

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.site-info-bordered').length).eql(0);
        should($('.site-info').length).eql(1);
        should($('.site-icon').length).eql(1);
        should($('.site-url').length).eql(1);
        should($('.site-url').hasClass('site-url-bottom-padding')).eql(true);
        should($('.site-url').text()).eql(newsletter.name);
        should($('.site-title').length).eql(1);
        should($('.site-subtitle').length).eql(0);
    });

    it('Shows the right html titleFontCategory isn\'t set to `serif` and when titleAlignment is set to `center`', function () {
        const post = {};
        const site = {};
        const templateSettings = {
            titleFontCategory: 'sans_serif',
            titleAlignment: 'center'
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        const postTitle = $('.post-title');
        should(postTitle.hasClass('post-title-serif')).eql(false);
        should(postTitle.hasClass('post-title-left')).eql(false);
        should($('.post-title a').hasClass('post-title-link-left')).eql(false);
        should($('.post-meta').hasClass('post-meta-left')).eql(false);
    });

    it('Renders correctly without a feature image (showFeatureImage set to `false`)', function () {
        const post = {
            feature_image: 'post feature image'
        };
        const site = {};
        const templateSettings = {
            showFeatureImage: false
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);

        should($('.feature-image').length).eql(0);
        should($('.feature-image-caption').length).eql(0);
    });

    it('Renders correctly without a feature image (post doesn\'t have a feature image)', function () {
        const post = {};
        const site = {};
        const templateSettings = {
            showFeatureImage: true
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);

        should($('.feature-image').length).eql(0);
        should($('.feature-image-caption').length).eql(0);
    });

    it('Renders correctly a feature image without width nor alt', function () {
        const post = {
            feature_image: 'post feature image'
        };
        const site = {};
        const templateSettings = {
            showFeatureImage: true
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);

        const featureImage = $('.feature-image');
        should(featureImage.length).eql(1);
        should(featureImage.hasClass('feature-image-with-caption')).eql(false);
        should(featureImage.find('img').attr('src')).eql(post.feature_image);
        should(typeof featureImage.find('img').attr('width')).eql('undefined');
        should(typeof featureImage.find('img').attr('alt')).eql('undefined');
    });

    it('Renders correctly without a feature image caption', function () {
        const post = {
            feature_image: 'post feature image'
        };
        const site = {};
        const templateSettings = {
            showFeatureImage: true
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);

        const featureImage = $('.feature-image');
        should(featureImage.length).eql(1);
        should(featureImage.hasClass('feature-image-with-caption')).eql(false);

        const imageCaption = $('.feature-image-caption');
        should(imageCaption.length).eql(0);
    });

    it('Shows no footer when `footerContent` is falsy', function () {
        const post = {};
        const site = {};
        const templateSettings = {
            footerContent: ''
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        const footer = $('.footer');
        should(footer.length).eql(1);
        should(footer.text()).eql(`${site.title} © ${(new Date()).getFullYear()} – Unsubscribe`);
    });

    it('Shows no badge when `showBadge` is false', function () {
        const post = {};
        const site = {};
        const templateSettings = {
            showBadge: false
        };
        const newsletter = {};

        const html = render({post, site, templateSettings, newsletter});

        const $ = cheerio.load(html);
        should($('.footer-powered').length).eql(0);
    });
});
