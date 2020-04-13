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

    // HELPERS -----------------------------------------------------------------

    function _readFigCaptionFromNode(node, payload) {
        let figcaption = node.querySelector('figcaption');

        if (figcaption) {
            let cleanHtml = cleanBasicHtml(figcaption.innerHTML, options);
            payload.caption = payload.caption ? `${payload.caption} / ${cleanHtml}` : cleanHtml;
            figcaption.remove(); // cleanup this processed element
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

        if (node.alt) {
            image.alt = node.alt;
        }

        if (node.title) {
            image.title = node.title;
        }

        return image;
    }

    function _createPayloadForIframe(iframe) {
        // If we don't have a src Or it's not an absolute URL, we can't handle this
        // This regex handles http://, https:// or //
        if (!iframe.src || !iframe.src.match(/^(https?:)?\/\//i)) {
            return;
        }

        // if it's a schemaless URL, convert to https
        if (iframe.src.match(/^\/\//)) {
            iframe.src = `https:${iframe.src}`;
        }

        let payload = {
            url: iframe.src
        };

        payload.html = iframe.outerHTML;

        return payload;
    }

    // PLUGINS -----------------------------------------------------------------

    function mixtapeEmbed(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'DIV' || !node.className.match(/graf--mixtapeEmbed/)) {
            return;
        }

        // Grab the relevant elements - Anchor wraps most of the data
        let anchorElement = node.querySelector('.markup--mixtapeEmbed-anchor');
        let titleElement = anchorElement.querySelector('.markup--mixtapeEmbed-strong');
        let descElement = anchorElement.querySelector('.markup--mixtapeEmbed-em');
        // Image is a top level field inside it's own a tag
        let imgElement = node.querySelector('.mixtapeImage');

        // Grab individual values from the elements
        let url = anchorElement.href;
        let title = '';
        let description = '';

        if (titleElement && titleElement.innerHTML) {
            title = cleanBasicHtml(titleElement.innerHTML, options);
            // Cleanup anchor so we can see what's left now that we've processed title
            anchorElement.removeChild(titleElement);
        }

        if (descElement && descElement.innerHTML) {
            description = cleanBasicHtml(descElement.innerHTML, options);
            // Cleanup anchor so we can see what's left now that we've processed description
            anchorElement.removeChild(descElement);
        }

        // // Format our preferred structure.
        let metadata = {
            url,
            title,
            description
        };

        // Publisher is the remaining text in the anchor, once title & desc are removed
        let publisher = cleanBasicHtml(anchorElement.innerHTML, options);
        if (publisher) {
            metadata.publisher = publisher;
        }

        // Image is optional,
        // The element usually still exists with an additional has.mixtapeImage--empty class and has no background image
        if (imgElement && imgElement.style['background-image']) {
            metadata.thumbnail = imgElement.style['background-image'].match(/url\(([^)]*?)\)/)[1];
        }

        let payload = {url, metadata};
        let cardSection = builder.createCardSection('bookmark', payload);
        addSection(cardSection);
        nodeFinished();
    }

    // https://github.com/TryGhost/Koenig/issues/1
    // allows arbitrary HTML blocks wrapped in our card comments to be extracted
    // into a HTML card rather than being put through the normal parse+plugins
    function kgHtmlCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 8 || node.nodeValue !== 'kg-card-begin: html') {
            return;
        }

        let html = [];

        function isHtmlEndComment(node) {
            return node && node.nodeType === 8 && node.nodeValue === 'kg-card-end: html';
        }

        let nextNode = node.nextSibling;
        while (nextNode && !isHtmlEndComment(nextNode)) {
            let currentNode = nextNode;
            html.push(currentNode.outerHTML);
            nextNode = currentNode.nextSibling;
            // remove nodes as we go so that they don't go through the parser
            currentNode.remove();
        }

        let payload = {html: html.join('\n').trim()};
        let cardSection = builder.createCardSection('html', payload);
        addSection(cardSection);
        nodeFinished();
    }

    // mobiledoc by default ignores <BR> tags but we have a custom SoftReturn atom
    function brToSoftBreakAtom(node, builder, {addMarkerable, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'BR') {
            return;
        }

        let softReturn = builder.createAtom('soft-return');
        addMarkerable(softReturn);

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
        function isGrafGallery(node) {
            return node.nodeType === 1 && node.tagName === 'DIV' && node.dataset && node.dataset.paragraphCount && node.querySelectorAll('img').length > 0;
        }

        if (!isGrafGallery(node)) {
            return;
        }

        let payload = {};

        // These galleries exist in multiple divs. Read the images and cation from the first one...
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

    function figureIframeToEmbedCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        let iframe = node.querySelector('iframe');

        if (!iframe) {
            return;
        }

        let payload = _createPayloadForIframe(iframe);

        if (!payload) {
            return;
        }

        _readFigCaptionFromNode(node, payload);

        let cardSection = builder.createCardSection('embed', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function iframeToEmbedCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'IFRAME') {
            return;
        }

        let payload = _createPayloadForIframe(node);

        if (!payload) {
            return;
        }

        let cardSection = builder.createCardSection('embed', payload);
        addSection(cardSection);
        nodeFinished();
    }

    function figureBlockquoteToEmbedCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        let blockquote = node.querySelector('blockquote');
        let link = node.querySelector('a');

        if (!blockquote || !link) {
            return;
        }

        let url = link.href;

        // If we don't have a url, or it's not an absolute URL, we can't handle this
        if (!url || !url.match(/^https?:\/\//i)) {
            return;
        }

        let payload = {
            url: url
        };

        _readFigCaptionFromNode(node, payload);

        payload.html = node.innerHTML;

        let cardSection = builder.createCardSection('embed', payload);
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

    return [
        mixtapeEmbed,
        kgHtmlCardToCard,
        brToSoftBreakAtom,
        removeLeadingNewline,
        kgGalleryCardToCard,
        figureBlockquoteToEmbedCard, // I think these can contain images
        grafGalleryToCard,
        figureToImageCard,
        imgToCard,
        hrToCard,
        figureToCodeCard,
        preCodeToCard,
        figureIframeToEmbedCard,
        iframeToEmbedCard, // Process iFrames without figures after ones with
        figureScriptToHtmlCard
    ];
}
