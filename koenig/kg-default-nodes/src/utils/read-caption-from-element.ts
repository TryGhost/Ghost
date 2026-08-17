import {buildCleanBasicHtmlForElement} from './build-clean-basic-html-for-element.js';

export function readCaptionFromElement(element: Element, {selector = 'figcaption'} = {}): string | undefined {
    const cleanBasicHtml = buildCleanBasicHtmlForElement(element);

    let caption: string | undefined;

    const figcaptions = Array.from(element.querySelectorAll(selector));
    if (figcaptions.length) {
        figcaptions.forEach((figcaption) => {
            const cleanHtml = cleanBasicHtml((figcaption as HTMLElement).innerHTML) ?? '';
            if (!cleanHtml.trim()) {
                return;
            }
            caption = caption ? `${caption} / ${cleanHtml}` : cleanHtml;
        });
    }

    return caption;
}
