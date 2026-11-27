import {addCreateDocumentOption} from '../../utils/add-create-document-option.js';
import type {ExportDOMOptions} from '../../export-dom.js';
import {renderWithVisibility, type Visibility} from '../../utils/visibility.js';
import {wrapReplacementStrings} from '../../utils/replacement-strings.js';
import {html} from '../../utils/tagged-template-fns.js';

interface TransistorNodeData {
    visibility?: Visibility;
}

interface TransistorRenderOptions extends ExportDOMOptions {
    design?: {
        accentColor?: string;
        [key: string]: unknown;
    };
}

export function renderTransistorNode(node: TransistorNodeData, options: TransistorRenderOptions = {}) {
    addCreateDocumentOption(options);
    const document = options.createDocument!();

    if (options.target === 'email') {
        return emailTemplate(node, document, options);
    }
    return frontendTemplate(node, document, options);
}

function setIframeAttributes(iframe: Element) {
    iframe.setAttribute('width', '100%');
    iframe.setAttribute('height', '370');
    iframe.setAttribute('frameborder', 'no');
    iframe.setAttribute('scrolling', 'no');
    iframe.setAttribute('seamless', '');
}

function frontendTemplate(node: TransistorNodeData, document: Document, options: TransistorRenderOptions) {
    const figure = document.createElement('figure');
    figure.setAttribute('class', 'kg-card kg-transistor-card');

    // Use {uuid} placeholder - content.js will substitute with member UUID at request time
    const embedUrl = new URL(`https://partner.transistor.fm/ghost/embed/{uuid}`);

    if (options.siteUuid) {
        embedUrl.searchParams.set('ctx', options.siteUuid);
    }

    const iframe = document.createElement('iframe');
    setIframeAttributes(iframe);
    iframe.setAttribute('title', 'Transistor podcasts');
    iframe.setAttribute('data-src', embedUrl.toString());
    iframe.setAttribute('data-kg-transistor-embed', '');
    figure.appendChild(iframe);

    // Use innerHTML to inject script - jsdom's createElement('script') doesn't serialize textContent in outerHTML
    figure.insertAdjacentHTML('beforeend', buildEmbedScript());

    // noscript fallback with src (not data-src) so the iframe loads without JS
    const noscript = document.createElement('noscript');
    const fallbackIframe = document.createElement('iframe');
    setIframeAttributes(fallbackIframe);
    fallbackIframe.setAttribute('src', embedUrl.toString());
    noscript.appendChild(fallbackIframe);
    figure.appendChild(noscript);

    return renderWithVisibility({element: figure, type: 'inner' as const}, node.visibility, options);
}

function emailTemplate(node: TransistorNodeData, document: Document, options: TransistorRenderOptions) {
    // Use the site accent color from the newsletter/email design settings
    const accentColor = options.design?.accentColor || '#15171A';

    // Use {uuid} replacement string - wrapReplacementStrings converts this to %%{uuid}%%
    // which gets replaced with actual member UUID when email is sent to each recipient
    const transistorUrl = 'https://partner.transistor.fm/ghost/{uuid}';

    const cardHtml = html`
        <table class="kg-card kg-transistor-card" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr>
                <td style="padding: 24px; text-align: center;">
                    <table cellspacing="0" cellpadding="0" border="0" width="100%" style="text-align: center;">
                        <tr>
                            <td style="text-align: center; padding-bottom: 12px;">
                                <a href="${transistorUrl}" style="display: inline-block; width: 72px; height: 72px; padding-top: 4px; padding-right: 4px; padding-bottom: 4px; padding-left: 4px; border-radius: 8px; background-color: ${accentColor}">
                                    <img src="https://static.ghost.org/v6.0.0/images/transistor-logo-ondark.png"
                                        width="40" height="40"
                                        alt="Transistor"
                                        style="width: 40px; height: 40px; padding: 16px;">
                                </a>
                            </td>
                        </tr>
                        <tr>
                            <td style="text-align: center;">
                                <a href="${transistorUrl}" class="kg-transistor-title">
                                    Listen to your podcasts
                                </a>
                                <a href="${transistorUrl}"  class="kg-transistor-description">
                                    Subscribe and listen to your personal podcast feed in your favorite app.
                                </a>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    `;

    const wrappedHtml = wrapReplacementStrings(cardHtml);

    const container = document.createElement('div');
    container.innerHTML = wrappedHtml;

    return renderWithVisibility({element: container.firstElementChild as HTMLElement, type: 'outer' as const}, node.visibility, options);
}

function buildEmbedScript() {
    // This script runs in the browser, not Node. It is emitted as verbatim
    // source text; String.raw keeps the regex backslashes intact.
    return String.raw`<script>(function initTransistorEmbed() {
        const script = document.currentScript;
        if (!script) {
            return;
        }

        // The card's figure wrapper is not part of the published HTML, so
        // several cards can share a parent. Each script only owns the iframe
        // rendered directly before it.
        const el = script.previousElementSibling;
        if (!el || !el.matches('iframe[data-src]')) {
            return;
        }

        // Set src with background color detection
        const baseSrc = el.getAttribute('data-src');

        // Colours are resolved from computed styles only. Reading canvas
        // pixels back is unreliable: anti-fingerprinting browsers randomise
        // getImageData, which sent a different colour on every page load.
        function toChannels(match, max) {
            const [r, g, b] = match.slice(1, 4).map(c => Math.round(Math.min(Math.max(Number(c) / max, 0), 1) * 255));
            const a = match[4] === undefined ? 1 : Number(match[4]);
            return [r, g, b, a].every(Number.isFinite) ? {r, g, b, a} : null;
        }

        function parseRgb(color) {
            const match = color.match(/^rgba?\(([^,]+), ([^,]+), ([^,]+?)(?:, ([^,]+))?\)$/);
            return match ? toChannels(match, 255) : null;
        }

        function parseSrgb(color) {
            const match = color.match(/^color\(srgb (\S+) (\S+) (\S+?)(?: \/ (\S+))?\)$/);
            return match ? toChannels(match, 1) : null;
        }

        // Computed styles keep modern colour spaces such as oklch() as
        // authored, so let CSS convert them to sRGB via color-mix().
        function convertToSrgb(color) {
            const probe = document.createElement('span');
            probe.hidden = true;
            probe.style.setProperty('background-color', 'color-mix(in srgb, ' + color + ' 100%, transparent)', 'important');
            script.parentElement.appendChild(probe);
            const converted = window.getComputedStyle(probe).backgroundColor;
            probe.remove();
            return parseSrgb(converted);
        }

        function findBackground() {
            for (let node = el.parentElement; node; node = node.parentElement) {
                const bg = window.getComputedStyle(node).backgroundColor;
                if (bg === 'transparent') {
                    // Older engines serialise transparent backgrounds as the keyword
                    continue;
                }
                const color = parseRgb(bg) || parseSrgb(bg) || convertToSrgb(bg);
                if (!color) {
                    // Unknown format: let Transistor fall back to its default
                    return null;
                }
                if (color.a > 0) {
                    return color;
                }
            }
            return null;
        }

        const background = findBackground();
        if (background) {
            const hex = [background.r, background.g, background.b].map(c => c.toString(16).padStart(2, '0')).join('');
            const u = new URL(baseSrc);
            u.searchParams.set('background', hex);
            el.src = u.toString();
        } else {
            el.src = baseSrc;
        }

        // Listen for resize messages from the Transistor iframe
        window.addEventListener('message', (event) => {
            const isMessageFromValidSource = (
                event.source === el.contentWindow &&
                event.origin === 'https://partner.transistor.fm'
            );
            if (!isMessageFromValidSource) {
                return;
            }

            const isDataValid = (
                !!event.data &&
                typeof event.data === 'object' &&
                !Array.isArray(event.data) &&
                'type' in event.data &&
                event.data.type === 'resize' &&
                'height' in event.data &&
                typeof event.data.height === 'number' &&
                Number.isSafeInteger(event.data.height) &&
                event.data.height >= 1
            );
            if (!isDataValid) {
                return;
            }

            el.style.height = event.data.height + 'px';
        });
    })()</script>`;
}
