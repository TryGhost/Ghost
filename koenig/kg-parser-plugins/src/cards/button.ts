function getButtonText(node) {
    let buttonText = node.textContent;
    if (buttonText) {
        buttonText = buttonText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return buttonText;
}

export function fromKoenigCard() {
    return function kgButtonCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-button-card')) {
            return;
        }

        const alignment = node.classList.contains('kg-align-center') ? 'center' : 'left';

        const anchor = node.querySelector('a');

        const buttonUrl = anchor.href;
        const buttonText = getButtonText(anchor);

        if (!buttonUrl || !buttonText) {
            return;
        }

        const payload = {
            alignment,
            buttonUrl,
            buttonText
        };

        const cardSection = builder.createCardSection('button', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromWordpressButton() {
    return function wordpressButtonToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('wp-block-button__link')) {
            return;
        }

        const buttonUrl = node.href;
        const buttonText = getButtonText(node);

        if (!buttonUrl || !buttonText) {
            return;
        }

        let alignment = 'left';

        if (node.closest('.is-content-justification-center, .is-content-justification-right')) {
            alignment = 'center';
        }

        const payload = {
            alignment,
            buttonUrl,
            buttonText
        };

        const cardSection = builder.createCardSection('button', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromSubstackButton() {
    return function substackButtonToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('button')) {
            return;
        }

        // substack has .button-wrapper elems with a data-attrs JSON object with `url` and `text`
        // we're not using that in favour of grabbing the anchor element directly for simplicity

        const anchor = node.tagName === 'A' ? node : node.querySelector('a');

        if (!anchor) {
            return;
        }

        const buttonUrl = anchor.href;
        const buttonText = getButtonText(anchor);

        if (!buttonUrl || !buttonText) {
            return;
        }

        const payload = {
            alignment: 'center', // all Substack buttons are centered
            buttonUrl,
            buttonText
        };

        const cardSection = builder.createCardSection('button', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
