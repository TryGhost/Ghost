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

        let buttonText = getButtonText(anchor);

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
