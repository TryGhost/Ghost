import cleanBasicHtml from '@tryghost/kg-clean-basic-html';

// mobiledoc by default ignores <BR> tags but we have a custom SoftReturn atom
export function brToSoftBreakAtom(node, builder, {addMarkerable, nodeFinished}) {
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
export function removeLeadingNewline(node) {
    if (node.nodeType !== 3 || node.nodeName !== '#text') {
        return;
    }

    node.nodeValue = node.nodeValue.replace(/^\n/, '');
}

export function figureToImageCard(node, builder, {addSection, nodeFinished}) {
    if (node.nodeType !== 1 || node.tagName !== 'FIGURE') {
        return;
    }

    let img = node.querySelector('img');
    let figcaption = node.querySelector('figcaption');

    if (!img) {
        return;
    }

    let payload = {
        src: img.src,
        alt: img.alt,
        title: img.title
    };

    if (figcaption) {
        let cleanHtml = cleanBasicHtml(figcaption.innerHTML);
        payload.caption = cleanHtml;
    }

    let cardSection = builder.createCardSection('image', payload);
    addSection(cardSection);
    nodeFinished();
}

export function imgToCard(node, builder, {addSection, nodeFinished}) {
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

export function hrToCard(node, builder, {addSection, nodeFinished}) {
    if (node.nodeType !== 1 || node.tagName !== 'HR') {
        return;
    }

    let cardSection = builder.createCardSection('hr');
    addSection(cardSection);
    nodeFinished();
}

export function figureToCodeCard(node, builder, {addSection, nodeFinished}) {
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

export function preCodeToCard(node, builder, {addSection, nodeFinished}) {
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

export default [
    brToSoftBreakAtom,
    removeLeadingNewline,
    figureToImageCard,
    imgToCard,
    hrToCard,
    figureToCodeCard,
    preCodeToCard
];
