import type {Builder, ParserPlugin, ParserPluginOptions, PluginOptions} from '../types.js';
import {addFigCaptionToPayload} from '../helpers.js';

function _createPayloadForIframe(iframe: HTMLIFrameElement): Record<string, unknown> | undefined {
    // If we don't have a src Or it's not an absolute URL, we can't handle this
    // This regex handles http://, https:// or //
    if (!iframe.src || !iframe.src.match(/^(https?:)?\/\//i)) {
        return;
    }

    // if it's a schemaless URL, convert to https
    if (iframe.src.match(/^\/\//)) {
        iframe.src = `https:${iframe.src}`;
    }

    const payload: Record<string, unknown> = {
        url: iframe.src
    };
    payload.html = iframe.outerHTML;

    return payload;
}

export function fromMixtape(options: ParserPluginOptions): ParserPlugin {
    return function mixtapeEmbed(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'DIV' || !(node as Element).className.match(/graf--mixtapeEmbed/)) {
            return;
        }

        const el = node as Element;
        // Grab the relevant elements - Anchor wraps most of the data
        const anchorElement = el.querySelector('.markup--mixtapeEmbed-anchor') as HTMLAnchorElement;
        const titleElement = anchorElement.querySelector('.markup--mixtapeEmbed-strong');
        const descElement = anchorElement.querySelector('.markup--mixtapeEmbed-em');
        // Image is a top level field inside it's own a tag
        const imgElement = el.querySelector('.mixtapeImage') as HTMLElement | null;

        // Grab individual values from the elements
        const url = anchorElement.href;
        let title = '';
        let description = '';

        if (titleElement && titleElement.innerHTML) {
            title = options.cleanBasicHtml!(titleElement.innerHTML) || '';
            // Cleanup anchor so we can see what's left now that we've processed title
            anchorElement.removeChild(titleElement);
        }

        if (descElement && descElement.innerHTML) {
            description = options.cleanBasicHtml!(descElement.innerHTML) || '';
            // Cleanup anchor so we can see what's left now that we've processed description
            anchorElement.removeChild(descElement);
        }

        const metadata: Record<string, unknown> = {
            url,
            title,
            description
        };

        // Publisher is the remaining text in the anchor, once title & desc are removed
        const publisher = options.cleanBasicHtml!(anchorElement.innerHTML);
        if (publisher) {
            metadata.publisher = publisher;
        }

        // Image is optional,
        // The element usually still exists with an additional has.mixtapeImage--empty class and has no background image
        if (imgElement && imgElement.style.backgroundImage) {
            const bgMatch = imgElement.style.backgroundImage.match(/url\(([^)]*?)\)/);
            if (bgMatch?.[1]) {
                metadata.thumbnail = bgMatch[1].replace(/^['"]|['"]$/g, '');
            }
        }

        const payload = {url, metadata};
        const cardSection = builder.createCardSection('bookmark', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromFigureIframe(options: ParserPluginOptions): ParserPlugin {
    return function figureIframeToEmbed(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'FIGURE') {
            return;
        }

        const el = node as Element;
        const iframe = el.querySelector('iframe') as HTMLIFrameElement | null;

        if (!iframe) {
            return;
        }

        const payload = _createPayloadForIframe(iframe);
        if (!payload) {
            return;
        }

        addFigCaptionToPayload(el, payload, {options});
        const cardSection = builder.createCardSection('embed', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromIframe(): ParserPlugin {
    return function iframeToEmbedCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'IFRAME') {
            return;
        }

        const payload = _createPayloadForIframe(node as HTMLIFrameElement);
        if (!payload) {
            return;
        }

        const cardSection = builder.createCardSection('embed', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromFigureBlockquote(options: ParserPluginOptions): ParserPlugin {
    return function figureBlockquoteToEmbedCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || (node as Element).tagName !== 'FIGURE') {
            return;
        }

        const el = node as Element;
        const blockquote = el.querySelector('blockquote');
        const link = el.querySelector('a') as HTMLAnchorElement | null;

        if (!blockquote || !link) {
            return;
        }

        const url = link.href;
        // If we don't have a url, or it's not an absolute URL, we can't handle this
        if (!url || !url.match(/^https?:\/\//i)) {
            return;
        }

        const payload: Record<string, unknown> = {
            url: url
        };

        addFigCaptionToPayload(el, payload, {options});
        payload.html = el.innerHTML;

        const cardSection = builder.createCardSection('embed', payload);
        addSection(cardSection);
        nodeFinished();
    };
}

export function fromNFTEmbed(): ParserPlugin {
    return function fromNFTEmbedToEmbedCard(node: Node, builder: Builder, {addSection, nodeFinished}: PluginOptions) {
        if (node.nodeType !== 1 || ((node as Element).tagName !== 'FIGURE' && (node as Element).tagName !== 'NFT-CARD' && (node as Element).tagName !== 'DIV')) {
            return;
        }

        const el = node as Element;

        // Attempt to parse Ghost NFT Card
        if (el.tagName === 'FIGURE') {
            if (!el.classList.contains('kg-nft-card')) {
                return;
            }

            const nftCard = el.querySelector('a') as HTMLAnchorElement | null;
            if (!nftCard) {
                return;
            }

            let payload: Record<string, unknown>;
            try {
                payload = JSON.parse(decodeURIComponent(nftCard.dataset.payload!));
            } catch {
                return nodeFinished();
            }

            const cardSection = builder.createCardSection('embed', payload);
            addSection(cardSection);
            return nodeFinished();
        }

        // Attempt to parse Substack NFT Card
        if (el.tagName === 'DIV') {
            if (!el.classList.contains('opensea')) {
                return;
            }

            const urlEl = el.querySelector('a') as HTMLAnchorElement;
            const urlMatch = urlEl.href.match(/\/assets\/(0x[0-9a-f]+)\/(\d+)/);
            if (!urlMatch) {
                return;
            }

            const [, contractAddress, tokenId] = urlMatch;
            const payload = {
                url: urlEl.href,
                html: `<nft-card contractAddress="${contractAddress}" tokenId="${tokenId}"></nft-card><script src="https://unpkg.com/embeddable-nfts/dist/nft-card.min.js"></script>`
            };

            const cardSection = builder.createCardSection('embed', payload);
            addSection(cardSection);
            return nodeFinished();
        }

        if (el.tagName === 'NFT-CARD') {
            const attr = el.attributes;
            const contractAddressAttr = attr.getNamedItem('contractAddress') || attr.getNamedItem('contractaddress') || attr.getNamedItem('tokenaddress');
            const tokenIdAttr = attr.getNamedItem('tokenId') || attr.getNamedItem('tokenid');
            const contractAddress = contractAddressAttr?.value;
            const tokenId = tokenIdAttr?.value;

            if (!contractAddress || !tokenId) {
                return;
            }

            const payload = {
                url: `https://opensea.io/assets/${contractAddress}/${tokenId}/`,
                html: `<nft-card contractAddress="${contractAddress}" tokenId="${tokenId}"></nft-card><script src="https://unpkg.com/embeddable-nfts/dist/nft-card.min.js"></script>`
            };

            const cardSection = builder.createCardSection('embed', payload);
            addSection(cardSection);
            return nodeFinished();
        }
    };
}
