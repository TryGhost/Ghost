import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {buildSrcBackgroundScript} from '../../utils/set-src-background-from-parent.js';
import {renderWithVisibility, type Visibility} from '../../utils/visibility.js';

interface TransistorNodeData {
    visibility?: Visibility;
}

interface TransistorRenderOptions extends ExportDOMOptions {}

function setIframeAttributes(iframe: Element) {
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '180');
    iframe.setAttribute('frameborder', 'no');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('seamless', '');
}

export function renderTransistorNode(node: TransistorNodeData, options: TransistorRenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    // {uuid} placeholder will be replaced server-side with the member's UUID
    const baseUrl = 'https://partner.transistor.fm/ghost/embed/{uuid}';
    const params = new URLSearchParams();

    if (options.siteUuid) {
        params.set('ctx', options.siteUuid);
    }

    const queryString = params.toString();
    const embedUrl = queryString ? `${baseUrl}?${queryString}` : baseUrl;

    const iframe = document.createElement('iframe');
    setIframeAttributes(iframe);
    iframe.setAttribute('data-src', embedUrl);

    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-transistor-card');
    figure.appendChild(iframe);
    figure.insertAdjacentElement('beforeend', buildSrcBackgroundScript(document));

    const noscript = document.createElement('noscript');
    const fallbackIframe = document.createElement('iframe');
    setIframeAttributes(fallbackIframe);
    fallbackIframe.setAttribute('src', embedUrl);
    noscript.appendChild(fallbackIframe);
    figure.appendChild(noscript);

    return renderWithVisibility({element: figure, type: 'inner' as const}, node.visibility, options);
}
