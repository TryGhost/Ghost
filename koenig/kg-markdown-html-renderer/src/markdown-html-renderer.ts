const MarkdownIt = require('markdown-it');
const semver = require('semver');
const {slugify: kgSlugify} = require('@tryghost/kg-utils');

const renderers = {};

const namedHeaders = function ({ghostVersion} = {}) {
    const slugify = function (inputString, usedHeaders = {}) {
        let slug = kgSlugify(inputString, {ghostVersion, type: 'markdown'});

        if (usedHeaders[slug]) {
            usedHeaders[slug] += 1;
            slug += usedHeaders[slug];
        }

        return slug;
    };

    return function (md) {
        const originalHeadingOpen = md.renderer.rules.heading_open;

        // originally from https://github.com/leff/markdown-it-named-headers
        // moved here to avoid pulling in http://stringjs.com dependency
        md.renderer.rules.heading_open = function (tokens, idx, something, somethingelse, self) {
            const usedHeaders = {};

            tokens[idx].attrs = tokens[idx].attrs || [];

            const title = tokens[idx + 1].children.reduce(function (acc, t) {
                return acc + t.content;
            }, '');

            const slug = slugify(title, usedHeaders);
            tokens[idx].attrs.push(['id', slug]);

            if (originalHeadingOpen) {
                return originalHeadingOpen.apply(this, arguments);
            } else {
                return self.renderToken.apply(self, arguments);
            }
        };
    };
};

const selectRenderer = function (options) {
    const version = semver.coerce(options.ghostVersion || '4.0');

    if (semver.satisfies(version, '<4.x')) {
        if (renderers['<4.x']) {
            return renderers['<4.x'];
        }

        const markdownIt = new MarkdownIt({html: true, breaks: true, linkify: true})
            .use(require('markdown-it-footnote'))
            .use(require('markdown-it-lazy-headers'))
            .use(require('markdown-it-mark'))
            .use(require('markdown-it-image-lazy-loading'))
            .use(namedHeaders(options))
            .use(require('markdown-it-sub'))
            .use(require('markdown-it-sup'));

        markdownIt.linkify.set({
            fuzzyLink: false
        });

        renderers['<4.x'] = markdownIt;
        return markdownIt;
    } else {
        if (renderers.latest) {
            return renderers.latest;
        }

        const markdownIt = new MarkdownIt({html: true, breaks: true, linkify: true})
            .use(require('markdown-it-footnote'))
            .use(require('markdown-it-lazy-headers'))
            .use(require('markdown-it-mark'))
            .use(require('markdown-it-image-lazy-loading'))
            .use(namedHeaders(options))
            .use(require('markdown-it-sub'))
            .use(require('markdown-it-sup'));

        markdownIt.linkify.set({
            fuzzyLink: false
        });

        renderers.latest = markdownIt;
        return markdownIt;
    }
};

module.exports = {
    render: function (markdown, options = {}) {
        return selectRenderer(options).render(markdown);
    }
};
