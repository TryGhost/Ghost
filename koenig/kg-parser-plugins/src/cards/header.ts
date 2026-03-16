import type {Builder, ParserPlugin, PluginOptions} from '../types.js';

export function fromKoenigCard(): ParserPlugin {
    return function kgHeaderCardToCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || !(node as Element).classList.contains('kg-header-card')) {
            return;
        }

        const el = node as Element;
        const headerNode = el.querySelector('.kg-header-card-header');
        const subheaderNode = el.querySelector('.kg-header-card-subheader');
        const buttonNode = el.querySelector('.kg-header-card-button') as HTMLAnchorElement | null;

        let header = '';
        let subheader = '';
        let buttonText = '';
        let buttonUrl = '';

        if (headerNode) {
            header = headerNode.innerHTML.trim();
        }

        if (subheaderNode) {
            subheader = subheaderNode.innerHTML.trim();
        }

        if (buttonNode) {
            buttonText = buttonNode.textContent!.trim();
            buttonUrl = buttonNode.getAttribute('href')!.trim();
        }

        if (!header && !subheader && (!buttonNode || !buttonText || !buttonUrl)) {
            return;
        }

        const classes = [...el.classList];
        let backgroundImageSrc = '';

        if (el.getAttribute('data-kg-background-image')) {
            backgroundImageSrc = el.getAttribute('data-kg-background-image')!.trim();
        }

        const payload: Record<string, unknown> = {
            header,
            subheader,
            buttonEnabled: Boolean(buttonNode),
            buttonText,
            buttonUrl,
            backgroundImageSrc,
            size: 'small',
            style: 'dark'
        };

        const sizeClass = classes.find(c => /^kg-size-(small|medium|large)$/.test(c));
        const styleClass = classes.find(c => /^kg-style-(dark|light|accent|image)$/.test(c));

        if (sizeClass) {
            payload.size = sizeClass.replace('kg-size-', '');
        }

        if (styleClass) {
            payload.style = styleClass.replace('kg-style-', '');
        }

        const cardSection = builder.createCardSection('header', payload);
        addSection(cardSection);
        nodeFinished();
    };
}
