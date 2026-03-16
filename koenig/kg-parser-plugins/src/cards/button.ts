import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

function getButtonText(node: Element): string {
    let buttonText = node.textContent;
    if (buttonText) {
        buttonText = buttonText.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
    }
    return buttonText || '';
}

export function fromKoenigCard(): ParserPlugin {
    return function kgButtonCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-button-card')) {
            return;
        }

        const el = node as Element;
        const alignment = el.classList.contains('kg-align-center') ? 'center' : 'left';
        const anchor = el.querySelector('a') as HTMLAnchorElement | null;

        if (!anchor) {
            return;
        }

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

export function fromWordpressButton(): ParserPlugin {
    return function wordpressButtonToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('wp-block-button__link')) {
            return;
        }

        const el = node as HTMLAnchorElement;
        const buttonUrl = el.href;
        const buttonText = getButtonText(el);

        if (!buttonUrl || !buttonText) {
            return;
        }

        let alignment = 'left';
        if (el.closest('.is-content-justification-center, .is-content-justification-right')) {
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

export function fromSubstackButton(): ParserPlugin {
    return function substackButtonToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('button')) {
            return;
        }

        // substack has .button-wrapper elems with a data-attrs JSON object with `url` and `text`
        // we're not using that in favour of grabbing the anchor element directly for simplicity

        const el = node as Element;
        const anchor = (el.tagName === 'A' ? el : el.querySelector('a')) as HTMLAnchorElement | null;

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
