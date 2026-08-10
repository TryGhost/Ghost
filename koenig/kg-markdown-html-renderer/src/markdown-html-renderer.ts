import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';
import type Renderer from 'markdown-it/lib/renderer.mjs';
import type {Options} from 'markdown-it';
import semver from 'semver';
import {slugify as kgSlugify} from '@tryghost/kg-utils';
import markdownItFootnote from 'markdown-it-footnote';
import markdownItLazyHeaders from 'markdown-it-lazy-headers';
import markdownItMark from 'markdown-it-mark';
import markdownItImageLazyLoading from 'markdown-it-image-lazy-loading';
import markdownItSub from 'markdown-it-sub';
import markdownItSup from 'markdown-it-sup';

const renderers: Record<string, MarkdownIt> = {};

interface RenderOptions {
    ghostVersion?: string;
}

const namedHeaders = function ({ghostVersion}: RenderOptions = {}) {
    const slugify = function (inputString: string, usedHeaders: Record<string, number> = {}) {
        let slug = kgSlugify(inputString, {ghostVersion, type: 'markdown'});
        if (usedHeaders[slug]) {
            usedHeaders[slug] += 1;
            slug += usedHeaders[slug];
        }
        return slug;
    };

    return function (md: MarkdownIt) {
        const originalHeadingOpen = md.renderer.rules.heading_open;

        // originally from https://github.com/leff/markdown-it-named-headers
        // moved here to avoid pulling in http://stringjs.com dependency
        md.renderer.rules.heading_open = function (tokens: Token[], idx: number, options: Options, env: unknown, self: Renderer) {
            const usedHeaders: Record<string, number> = {};
            tokens[idx].attrs = tokens[idx].attrs || [];
            const title = tokens[idx + 1].children!.reduce(function (acc: string, t: Token) {
                return acc + t.content;
            }, '');
            const slug = slugify(title, usedHeaders);
            tokens[idx].attrs!.push(['id', slug]);
            if (originalHeadingOpen) {
                return originalHeadingOpen.call(this, tokens, idx, options, env, self);
            } else {
                return self.renderToken(tokens, idx, options);
            }
        };
    };
};

const selectRenderer = function (options: RenderOptions): MarkdownIt {
    const version = semver.coerce(options.ghostVersion || '4.0');

    if (version && semver.satisfies(version, '<4.x')) {
        if (renderers['<4.x']) {
            return renderers['<4.x'];
        }
        const markdownIt = new MarkdownIt({html: true, breaks: true, linkify: true})
            .use(markdownItFootnote).use(markdownItLazyHeaders).use(markdownItMark)
            .use(markdownItImageLazyLoading).use(namedHeaders(options)).use(markdownItSub).use(markdownItSup);
        markdownIt.linkify.set({fuzzyLink: false});
        renderers['<4.x'] = markdownIt;
        return markdownIt;
    } else {
        if (renderers.latest) {
            return renderers.latest;
        }
        const markdownIt = new MarkdownIt({html: true, breaks: true, linkify: true})
            .use(markdownItFootnote).use(markdownItLazyHeaders).use(markdownItMark)
            .use(markdownItImageLazyLoading).use(namedHeaders(options)).use(markdownItSub).use(markdownItSup);
        markdownIt.linkify.set({fuzzyLink: false});
        renderers.latest = markdownIt;
        return markdownIt;
    }
};

export function render(markdown: string, options: RenderOptions = {}): string {
    return selectRenderer(options).render(markdown);
}
