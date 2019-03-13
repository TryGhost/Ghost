/**
 * Copied from:
 * https://github.com/TryGhost/Ghost-Admin/blob/1f3d77d7230dd47a7eb5f38b90dfa510b2a16801/lib/koenig-editor/addon/options/parser-plugins.js
 * Which makes use of:
 * https://github.com/TryGhost/Ghost-Admin/blob/1f3d77d7230dd47a7eb5f38b90dfa510b2a16801/lib/koenig-editor/addon/helpers/clean-basic-html.js
 *
 * These functions are used to proces nodes during parsing from DOM -> mobiledoc
 */

// @TODO: resolve browser vs node env here
// import {cleanBasicHtml} from 'koenig-editor/helpers/clean-basic-html';

// mobiledoc by default ignores <BR> tags but we have a custom SoftReturn atom
const brToSoftBreakAtom = (node, builder, {addMarkerable, nodeFinished}) => {
    if (node.nodeType !== 1 || node.tagName !== 'BR') {
        return;
    }

    let softReturn = builder.createAtom('soft-return');
    addMarkerable(softReturn);

    nodeFinished();
};

// leading newlines in text nodes will add a space to the beginning of the text
// which doesn't render correctly if we're replacing <br> with SoftReturn atoms
// after parsing text as markdown to html
const removeLeadingNewline = (node) => {
    if (node.nodeType !== 3 || node.nodeName !== '#text') {
        return;
    }

    node.nodeValue = node.nodeValue.replace(/^\n/, '');
};

const figureToImageCard = (node, builder, {addSection, nodeFinished}) => {
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
        // @TODO: resolve browser vs node env here
        //let cleanHtml = cleanBasicHtml(figcaption.innerHTML);
        //payload.caption = cleanHtml;
        payload.caption = figcaption.innerHTML;
    }

    let cardSection = builder.createCardSection('image', payload);
    addSection(cardSection);
    nodeFinished();
};

const imgToCard = (node, builder, {addSection, nodeFinished}) => {
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
};

const hrToCard = (node, builder, {addSection, nodeFinished}) => {
    if (node.nodeType !== 1 || node.tagName !== 'HR') {
        return;
    }

    let cardSection = builder.createCardSection('hr');
    addSection(cardSection);
    nodeFinished();
};

const preCodeToCard = (node, builder, {addSection, nodeFinished}) => {
    if (node.nodeType !== 1 || node.tagName !== 'PRE') {
        return;
    }

    let [codeElement] = node.children;

    if (codeElement && codeElement.tagName === 'CODE') {
        let payload = {code: codeElement.textContent};
        let cardSection = builder.createCardSection('code', payload);
        addSection(cardSection);
        nodeFinished();
    }
};

module.exports = [
    brToSoftBreakAtom,
    removeLeadingNewline,
    figureToImageCard,
    imgToCard,
    hrToCard,
    preCodeToCard
];
