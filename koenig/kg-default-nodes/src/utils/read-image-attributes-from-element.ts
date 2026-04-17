export function readImageAttributesFromElement(element: HTMLImageElement) {
    const attrs: Record<string, string | number> = {};

    if (element.src) {
        attrs.src = element.src;
    }

    if (element.width) {
        attrs.width = element.width;
    } else if (element.dataset && element.dataset.width) {
        attrs.width = parseInt(element.dataset.width, 10);
    }

    if (element.height) {
        attrs.height = element.height;
    } else if (element.dataset && element.dataset.height) {
        attrs.height = parseInt(element.dataset.height, 10);
    }

    if ((!element.width && !element.height) && element.getAttribute('data-image-dimensions')) {
        const match = (/^(\d*)x(\d*)$/gi).exec(element.getAttribute('data-image-dimensions')!);
        if (match) {
            const [, width, height] = match;
            attrs.width = parseInt(width, 10);
            attrs.height = parseInt(height, 10);
        }
    }

    if (element.alt) {
        attrs.alt = element.alt;
    }

    if (element.title) {
        attrs.title = element.title;
    }

    if (element.parentNode && (element.parentNode as HTMLElement).tagName === 'A') {
        const href = (element.parentNode as HTMLAnchorElement).href;

        if (href !== attrs.src) {
            attrs.href = href;
        }
    }

    return attrs;
}
