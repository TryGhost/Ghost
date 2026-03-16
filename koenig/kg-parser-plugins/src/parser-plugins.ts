/**
 * Copied from:
 * https://github.com/TryGhost/Ghost-Admin/blob/1f3d77d7230dd47a7eb5f38b90dfa510b2a16801/lib/koenig-editor/addon/options/parser-plugins.js
 * Which makes use of:
 * https://github.com/TryGhost/Ghost-Admin/blob/1f3d77d7230dd47a7eb5f38b90dfa510b2a16801/lib/koenig-editor/addon/helpers/clean-basic-html.js
 *
 * These functions are used to proces nodes during parsing from DOM -> mobiledoc
 */
import {cleanBasicHtml} from '@tryghost/kg-clean-basic-html';
import type {Builder, ParserPlugin, ParserPluginOptions, PluginOptions} from './types.js';
import * as audioCard from './cards/audio.js';
import * as buttonCard from './cards/button.js';
import * as embedCard from './cards/embed.js';
import * as fileCard from './cards/file.js';
import * as headerCard from './cards/header.js';
import * as htmlCard from './cards/html.js';
import * as imageCard from './cards/image.js';
import * as productCard from './cards/product.js';
import * as softReturn from './cards/soft-return.js';
import * as videoCard from './cards/video.js';
import * as galleryCard from './cards/gallery.js';

export function createParserPlugins(_options: Partial<ParserPluginOptions> = {}): ParserPlugin[] {
    const options: ParserPluginOptions = Object.assign({}, _options) as ParserPluginOptions;

    if (!options.createDocument) {
        const Parser = (typeof DOMParser !== 'undefined' && DOMParser) || (typeof window !== 'undefined' && window.DOMParser);

        if (!Parser) {
            throw new Error('createParserPlugins() must be passed a `createDocument` function as an option when used in a non-browser environment');
        }

        options.createDocument = function (html: string): Document {
            const parser = new Parser();
            return parser.parseFromString(html, 'text/html');
        };
    }

    options.cleanBasicHtml = function (html: string): string | null {
        return cleanBasicHtml(html, options);
    };

    // HELPERS -----------------------------------------------------------------

    function _readFigCaptionFromNode(node: Element, payload: Record<string, unknown>, selector = 'figcaption'): void {
        const figcaptions = Array.from(node.querySelectorAll(selector));

        if (figcaptions.length) {
            figcaptions.forEach((caption) => {
                const cleanHtml = options.cleanBasicHtml!(caption.innerHTML);
                payload.caption = payload.caption ? `${payload.caption} / ${cleanHtml}` : cleanHtml;
                caption.remove(); // cleanup this processed element
            });
        }
    }

    // PLUGINS -----------------------------------------------------------------

    function kgCalloutCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions): void {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-callout-card')) {
            return;
        }

        const el = node as HTMLElement;
        const emojiNode = el.querySelector('.kg-callout-emoji');
        const htmlNode = el.querySelector('.kg-callout-text');
        const backgroundColor = el.style.backgroundColor || '#F1F3F4';

        let calloutEmoji = '';
        if (emojiNode) {
            calloutEmoji = emojiNode?.textContent || '';
            if (calloutEmoji) {
                calloutEmoji = calloutEmoji.trim();
            }
        }

        const calloutText = htmlNode?.innerHTML || '';

        const payload = {
            calloutEmoji,
            calloutText,
            backgroundColor
        };

        const cardSection = builder.createCardSection('callout', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function kgToggleCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions): void {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-toggle-card')) {
            return;
        }

        const el = node as Element;
        const headingNode = el.querySelector('.kg-toggle-heading-text')!;
        const contentNode = el.querySelector('.kg-toggle-content') as HTMLElement;
        const toggleHeading = headingNode.innerHTML;
        const toggleContent = contentNode.innerText;

        const payload = {
            heading: toggleHeading,
            content: toggleContent
        };

        const cardSection = builder.createCardSection('toggle', payload);
        addSection(cardSection);
        nodeFinished();
    }

    // leading newlines in text nodes will add a space to the beginning of the text
    // which doesn't render correctly if we're replacing <br> with SoftReturn atoms
    // after parsing text as markdown to html
    function removeLeadingNewline(node: Node): void {
        if (node.nodeType !== 3 || node.nodeName !== '#text') {
            return;
        }
        node.nodeValue = node.nodeValue!.replace(/^\n/, '');
    }

    function hrToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions): void {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'HR') {
            return;
        }

        const cardSection = builder.createCardSection('hr');
        addSection(cardSection);
        nodeFinished();
    }

    function figureToCodeCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions): void {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'FIGURE') {
            return;
        }

        const el = node as Element;
        const pre = el.querySelector('pre');

        // If this figure doesn't have a pre tag in it
        if (!pre) {
            return;
        }

        const code = pre.querySelector('code');
        const figcaption = el.querySelector('figcaption');

        // if there's no caption the preCodeToCard plugin will pick it up instead
        if (!code || !figcaption) {
            return;
        }

        const payload: Record<string, unknown> = {
            code: code.textContent
        };

        _readFigCaptionFromNode(el, payload);

        const preClass = pre.getAttribute('class') || '';
        const codeClass = code.getAttribute('class') || '';
        const langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
        const languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);

        if (languageMatches) {
            payload.language = languageMatches[1].toLowerCase();
        }

        const cardSection = builder.createCardSection('code', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function preCodeToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions): void {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'PRE') {
            return;
        }

        const el = node as Element;
        const [codeElement] = el.children;

        if (codeElement && codeElement.tagName === 'CODE') {
            const payload: Record<string, unknown> = {code: codeElement.textContent};

            const preClass = el.getAttribute('class') || '';
            const codeClass = codeElement.getAttribute('class') || '';
            const langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
            const languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);

            if (languageMatches) {
                payload.language = languageMatches[1].toLowerCase();
            }

            const cardSection = builder.createCardSection('code', payload);
            addSection(cardSection);
            nodeFinished();
        }
    }

    function figureScriptToHtmlCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions): void {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'FIGURE') {
            return;
        }

        const el = node as Element;
        const script = el.querySelector('script') as HTMLScriptElement | null;

        if (!script || !script.src.match(/^https:\/\/gist\.github\.com/)) {
            return;
        }

        const payload = {html: script.outerHTML};
        const cardSection = builder.createCardSection('html', payload);
        addSection(cardSection);
        nodeFinished();
    }

    // Nested paragraphs in blockquote are currently treated as separate blockquotes,
    // see [here](https://github.com/bustle/mobiledoc-kit/issues/715). When running migrations,
    // this is not the desired behaviour and will cause the content to lose the previous semantic.
    function blockquoteWithChildren(node: Node): void {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'BLOCKQUOTE' || (node as Element).children.length < 1) {
            return;
        }

        const el = node as Element;
        const html: string[] = [];
        const children = Array.from(el.children);

        children.forEach((child) => {
            const nextSibling = child.nextSibling as Element | null;
            const previousSibling = child.previousSibling as Element | null;

            // Only add a soft-break for two sequential paragraphs.
            // Use the innerHTML only in that case, so Mobiledoc's default behaviour
            // of creating separate blockquotes doesn't apply.
            if (child.tagName === 'P' && (nextSibling && nextSibling.tagName === 'P')) {
                html.push(`${child.innerHTML}<br><br>`);
            } else if (child.tagName === 'P' && (previousSibling && previousSibling.tagName === 'P')) {
                html.push(child.innerHTML);
            } else {
                html.push(child.outerHTML);
            }
        });

        el.innerHTML = html.join('').trim();
        return;
    }

    // we store alt-style blockquotes as `aside` sections as a workaround
    // for mobiledoc not allowing arbitrary attributes on markup sections
    function altBlockquoteToAside(node: Node): void {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'BLOCKQUOTE') {
            return;
        }

        const el = node as Element;
        if (!el.classList.contains('kg-blockquote-alt')) {
            return;
        }

        const replacementDoc = options.createDocument!(`<aside>${el.innerHTML}</aside>`);
        const aside = replacementDoc.querySelector('aside')!;

        el.textContent = '';
        el.appendChild(aside);
        return;
    }

    function tableToHtmlCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions): void {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'TABLE') {
            return;
        }

        const el = node as Element;
        if ((el.parentNode as Element)?.tagName === 'TABLE') {
            return;
        }

        const payload = {html: el.outerHTML};
        const cardSection = builder.createCardSection('html', payload);
        addSection(cardSection);
        nodeFinished();
    }

    return [
        embedCard.fromNFTEmbed(),
        embedCard.fromMixtape(options),
        htmlCard.fromKoenigCard(),
        buttonCard.fromKoenigCard(),
        buttonCard.fromWordpressButton(),
        buttonCard.fromSubstackButton(),
        kgCalloutCardToCard,
        kgToggleCardToCard,
        productCard.fromKoenigCard(),
        audioCard.fromKoenigCard(),
        videoCard.fromKoenigCard(),
        fileCard.fromKoenigCard(),
        headerCard.fromKoenigCard(),
        blockquoteWithChildren,
        softReturn.fromBr(),
        removeLeadingNewline,
        galleryCard.fromKoenigCard(options),
        embedCard.fromFigureBlockquote(options),
        galleryCard.fromGrafGallery(options),
        galleryCard.fromSqsGallery(options),
        imageCard.fromFigure(options),
        imageCard.fromImg(),
        hrToCard,
        figureToCodeCard,
        preCodeToCard,
        embedCard.fromFigureIframe(options),
        embedCard.fromIframe(),
        figureScriptToHtmlCard,
        altBlockquoteToAside,
        tableToHtmlCard
    ];
}
