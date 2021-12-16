/* global DOMParser, window */

/**
 * Copied from:
 * https://github.com/TryGhost/Ghost-Admin/blob/1f3d77d7230dd47a7eb5f38b90dfa510b2a16801/lib/koenig-editor/addon/options/parser-plugins.js
 * Which makes use of:
 * https://github.com/TryGhost/Ghost-Admin/blob/1f3d77d7230dd47a7eb5f38b90dfa510b2a16801/lib/koenig-editor/addon/helpers/clean-basic-html.js
 *
 * These functions are used to proces nodes during parsing from DOM -> mobiledoc
 */

import cleanBasicHtml from '@tryghost/kg-clean-basic-html';

import * as buttonCard from './cards/button';
import * as embedCard from './cards/embed';
import * as htmlCard from './cards/html';
import * as softReturn from './cards/softReturn';
import * as productCard from './cards/product';
import * as audioCard from './cards/audio';
import * as videoCard from './cards/video';
import * as beforeAfterCard from './cards/before-after';
import * as fileCard from './cards/file';
import * as headerCard from './cards/header';

export function createParserPlugins(_options = {}) {
    const defaults = {};
    const options = Object.assign({}, defaults, _options);

    if (!options.createDocument) {
        const Parser = (typeof DOMParser !== 'undefined' && DOMParser) || (typeof window !== 'undefined' && window.DOMParser);

        if (!Parser) {
            throw new Error('createParserPlugins() must be passed a `createDocument` function as an option when used in a non-browser environment');
        }

        options.createDocument = function (html) {
            const parser = new Parser();
            return parser.parseFromString(html, 'text/html');
        };
    }

    options.cleanBasicHtml = function (html) {
        return cleanBasicHtml(html, options);
    };

    // HELPERS -----------------------------------------------------------------

    function _readFigCaptionFromNode(node, payload, selector = 'figcaption') {
        let figcaptions = Array.from(node.querySelectorAll(selector));

        if (figcaptions.length) {
            figcaptions.forEach((caption) => {
                let cleanHtml = options.cleanBasicHtml(caption.innerHTML);
                payload.caption = payload.caption ? `${payload.caption} / ${cleanHtml}` : cleanHtml;
                caption.remove(); // cleanup this processed element
            });
        }
    }

    function _readGalleryImageFromNode(node, imgNum) {
        let fileName = node.src.match(/[^/]*$/)[0];
        let image = {
            fileName,
            row: Math.floor(imgNum / 3),
            src: node.src
        };

        if (node.width) {
            image.width = node.width;
        } else if (node.dataset && node.dataset.width) {
            image.width = parseInt(node.dataset.width, 10);
        }

        if (node.height) {
            image.height = node.height;
        } else if (node.dataset && node.dataset.height) {
            image.height = parseInt(node.dataset.height, 10);
        }

        if ((!node.width && !node.height) && node.getAttribute('data-image-dimensions')) {
            const [, width, height] = (/^(\d*)x(\d*)$/gi).exec(node.getAttribute('data-image-dimensions'));
            image.width = parseInt(width, 10);
            image.height = parseInt(height, 10);
        }

        if (node.alt) {
            image.alt = node.alt;
        }

        if (node.title) {
            image.title = node.title;
        }

        return image;
    }

    // PLUGINS -----------------------------------------------------------------

    function kgCalloutCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-callout-card')) {
            return;
        }

        const emojiNode = node.querySelector('.kg-callout-emoji');
        const htmlNode = node.querySelector('.kg-callout-text');

        const backgroundColor = node.style.backgroundColor || '#F1F3F4';

        let calloutEmoji = '';
        if (emojiNode) {
            calloutEmoji = emojiNode.textContent;
            if (calloutEmoji) {
                calloutEmoji = calloutEmoji.trim();
            }
        }

        let calloutText = htmlNode.innerHTML;

        const payload = {
            calloutEmoji,
            calloutText,
            backgroundColor
        };

        const cardSection = builder.createCardSection('callout', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function kgToggleCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-toggle-card')) {
            return;
        }

        const headingNode = node.querySelector('.kg-toggle-heading-text');
        const contentNode = node.querySelector('.kg-toggle-content');

        let toggleHeading = headingNode.innerHTML;
        let toggleContent = contentNode.innerText;

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
    function removeLeadingNewline(node) {
        if (node.nodeType !== 3 || node.nodeName !== '#text') {
            return;
        }

        node.nodeValue = node.nodeValue.replace(/^\n/, '');
    }

    const kgGalleryCardToCard = (node, builder, {addSection, nodeFinished}) => {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        if (!node.className.match(/kg-gallery-card/)) {
            return;
        }

        let payload = {};
        let imgs = Array.from(node.querySelectorAll('img'));

        // Process nodes into the payload
        payload.images = imgs.map(_readGalleryImageFromNode);

        _readFigCaptionFromNode(node, payload);

        let cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    };

    function grafGalleryToCard(node, builder, {addSection, nodeFinished}) {
        function isGrafGallery(n) {
            return n.nodeType === 1 && n.tagName === 'DIV' && n.dataset && n.dataset.paragraphCount && n.querySelectorAll('img').length > 0;
        }

        if (!isGrafGallery(node)) {
            return;
        }

        let payload = {};

        // These galleries exist in multiple divs. Read the images and caption from the first one...
        let imgs = Array.from(node.querySelectorAll('img'));
        _readFigCaptionFromNode(node, payload);

        // ...and then iterate over any remaining divs until we run out of matches
        let nextNode = node.nextSibling;
        while (nextNode && isGrafGallery(nextNode)) {
            let currentNode = nextNode;
            imgs = imgs.concat(Array.from(currentNode.querySelectorAll('img')));
            _readFigCaptionFromNode(currentNode, payload);
            nextNode = currentNode.nextSibling;
            // remove nodes as we go so that they don't go through the parser
            currentNode.remove();
        }

        // Process nodes into the payload
        payload.images = imgs.map(_readGalleryImageFromNode);

        let cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function sqsGalleriesToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'DIV' || !node.className.match(/sqs-gallery-container/) || node.className.match(/summary-/)) {
            return;
        }

        let payload = {};

        // Each image exists twice...
        // The first image is wrapped in `<noscript>`
        // The second image contains image dimensions but the src property needs to be taken from `data-src`.
        let imgs = Array.from(node.querySelectorAll('img.thumb-image'));

        imgs = imgs.map((img) => {
            if (!img.getAttribute('src')) {
                if (img.previousSibling.tagName === 'NOSCRIPT' && img.previousSibling.getElementsByTagName('img').length) {
                    const prevNode = img.previousSibling;
                    img.setAttribute('src', img.getAttribute('data-src'));
                    prevNode.remove();
                } else {
                    return;
                }
            }

            return img;
        });

        _readFigCaptionFromNode(node, payload, '.meta-title');

        // Process nodes into the payload
        payload.images = imgs.map(_readGalleryImageFromNode);

        let cardSection = builder.createCardSection('gallery', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function figureToImageCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        let img = node.querySelector('img');
        let kgClass = node.className.match(/kg-width-(wide|full)/);
        let grafClass = node.className.match(/graf--layout(FillWidth|OutsetCenter)/);

        if (!img) {
            return;
        }

        let payload = {
            src: img.src,
            alt: img.alt,
            title: img.title
        };

        if (kgClass) {
            payload.cardWidth = kgClass[1];
        } else if (grafClass) {
            payload.cardWidth = grafClass[1] === 'FillWidth' ? 'full' : 'wide';
        }

        _readFigCaptionFromNode(node, payload);

        let cardSection = builder.createCardSection('image', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function imgToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'IMG') {
            return;
        }

        let payload = {
            src: node.src,
            alt: node.alt,
            title: node.title
        };

        let cardSection = builder.createCardSection('image', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function hrToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'HR') {
            return;
        }

        let cardSection = builder.createCardSection('hr');
        addSection(cardSection);
        nodeFinished();
    }

    function figureToCodeCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        let pre = node.querySelector('pre');

        // If this figure doesn't have a pre tag in it
        if (!pre) {
            return;
        }

        let code = pre.querySelector('code');
        let figcaption = node.querySelector('figcaption');

        // if there's no caption the preCodeToCard plugin will pick it up instead
        if (!code || !figcaption) {
            return;
        }

        let payload = {
            code: code.textContent
        };

        _readFigCaptionFromNode(node, payload);

        let preClass = pre.getAttribute('class') || '';
        let codeClass = code.getAttribute('class') || '';
        let langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
        let languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);
        if (languageMatches) {
            payload.language = languageMatches[1].toLowerCase();
        }

        let cardSection = builder.createCardSection('code', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function preCodeToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'PRE') {
            return;
        }

        let [codeElement] = node.children;

        if (codeElement && codeElement.tagName === 'CODE') {
            let payload = {code: codeElement.textContent};

            let preClass = node.getAttribute('class') || '';
            let codeClass = codeElement.getAttribute('class') || '';
            let langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
            let languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);
            if (languageMatches) {
                payload.language = languageMatches[1].toLowerCase();
            }

            let cardSection = builder.createCardSection('code', payload);
            addSection(cardSection);
            nodeFinished();
        }
    }

    function figureScriptToHtmlCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        let script = node.querySelector('script');

        if (!script || !script.src.match(/^https:\/\/gist\.github\.com/)) {
            return;
        }

        let payload = {html: script.outerHTML};
        let cardSection = builder.createCardSection('html', payload);
        addSection(cardSection);
        nodeFinished();
    }

    // Nested paragraphs in blockquote are currently treated as separate blockquotes,
    // see [here](https://github.com/bustle/mobiledoc-kit/issues/715). When running migrations,
    // this is not the desired behaviour and will cause the content to lose the previous semantic.
    function blockquoteWithChildren(node) {
        if (node.nodeType !== 1 || node.tagName !== 'BLOCKQUOTE' || node.children.length < 1) {
            return;
        }

        const html = [];
        const children = Array.from(node.children);

        children.forEach((child) => {
            let nextSibling = child.nextSibling;
            let previousSibling = child.previousSibling;

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

        node.innerHTML = html.join('').trim();

        return;
    }

    // we store alt-style blockquotes as `aside` sections as a workaround
    // for mobiledoc not allowing arbitrary attributes on markup sections
    function altBlockquoteToAside(node) {
        if (node.nodeType !== 1 || node.tagName !== 'BLOCKQUOTE') {
            return;
        }

        if (!node.classList.contains('kg-blockquote-alt')) {
            return;
        }

        const replacementDoc = options.createDocument(`<aside>${node.innerHTML}</aside>`);
        const aside = replacementDoc.querySelector('aside');

        // bit of an ugly hack because
        // 1. node.tagName is readonly so we can't directly change it's type
        // 2. the node list of the current tree branch is not re-evaluated so removing
        //    this node, replacing it, or adding a new _sibling_ will not be picked up
        //
        // relies on mobiledoc-kit's handling of nested elements picking the
        // inner-most understandable section element when creating sections
        node.textContent = '';
        node.appendChild(aside);

        // let the default parser handle the nested aside node, keeping any formatting
        return;
    }

    function tableToHtmlCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'TABLE') {
            return;
        }

        if (node.parentNode.tagName === 'TABLE') {
            return;
        }

        let payload = {html: node.outerHTML};
        let cardSection = builder.createCardSection('html', payload);
        addSection(cardSection);
        nodeFinished();
    }

    return [
        beforeAfterCard.fromKoenigCard(options),
        beforeAfterCard.fromJetpackCard(options),
        embedCard.fromNFTEmbed(),
        embedCard.fromMixtape(options),
        htmlCard.fromKoenigCard(options),
        buttonCard.fromKoenigCard(options),
        buttonCard.fromWordpressButton(options),
        buttonCard.fromSubstackButton(options),
        kgCalloutCardToCard,
        kgToggleCardToCard,
        productCard.fromKoenigCard(options),
        audioCard.fromKoenigCard(options),
        videoCard.fromKoenigCard(options),
        fileCard.fromKoenigCard(options),
        headerCard.fromKoenigCard(options),
        blockquoteWithChildren,
        softReturn.fromBr(options),
        removeLeadingNewline,
        kgGalleryCardToCard,
        embedCard.fromFigureBlockquote(options), // I think these can contain images
        grafGalleryToCard,
        sqsGalleriesToCard,
        figureToImageCard,
        imgToCard,
        hrToCard,
        figureToCodeCard,
        preCodeToCard,
        embedCard.fromFigureIframe(options),
        embedCard.fromIframe(options), // Process iFrames without figures after ones with
        figureScriptToHtmlCard,
        altBlockquoteToAside,
        tableToHtmlCard
    ];
}
