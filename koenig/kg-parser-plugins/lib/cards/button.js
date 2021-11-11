export function fromKoenigCard() {
    return function kgButtonCardToCard(node, builder, {addSection, nodeFinished}) {
        if (node.nodeType !== 1 || !node.classList.contains('kg-button-card')) {
            return;
        }

        const alignment = node.classList.contains('kg-align-center') ? 'center' : 'left';

        const anchor = node.querySelector('a');
        const buttonUrl = anchor.href;

        let buttonText = anchor.textContent;
        if (buttonText) {
            buttonText = buttonText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
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
