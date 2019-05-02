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
        if (!DOMParser || (window && !window.DOMParser)) {
            throw new Error('createParserPlugins() must be passed a `createDocument` function as an option when used in a non-browser environment');
        }

        options.createDocument = function (html) {
            const parser = new (DOMParser || (window && window.DOMParser))();
            return parser.parseFromString(html, 'text/html');
        };
    }

    // PLUGINS -----------------------------------------------------------------

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

    function figureToImageCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
            return;
        }

        let img = node.querySelector('img');
        let figcaption = node.querySelector('figcaption');
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

        if (figcaption) {
            let cleanHtml = cleanBasicHtml(figcaption.innerHTML, options);
            payload.caption = cleanHtml;
        }

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
        let code = pre.querySelector('code');
        let figcaption = node.querySelector('figcaption');

        // if there's no caption the preCodeToCard plugin will pick it up instead
        if (!code || !figcaption) {
            return;
        }

        let payload = {
            code: code.textContent,
            caption: cleanBasicHtml(figcaption.innerHTML)
        };

        let preClass = code.getAttribute('class');
        let codeClass = code.getAttribute('class');
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

            let preClass = node.getAttribute('class');
            let codeClass = codeElement.getAttribute('class');
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

    return [
        brToSoftBreakAtom,
        removeLeadingNewline,
        figureToImageCard,
        imgToCard,
        hrToCard,
        figureToCodeCard,
        preCodeToCard
    ];
}
