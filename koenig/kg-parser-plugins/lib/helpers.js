export function addFigCaptionToPayload(node, payload, {selector = 'figcaption', options}) {
    let figcaptions = Array.from(node.querySelectorAll(selector));

    if (figcaptions.length) {
        figcaptions.forEach((caption) => {
            let cleanHtml = options.cleanBasicHtml(caption.innerHTML);
            payload.caption = payload.caption ? `${payload.caption} / ${cleanHtml}` : cleanHtml;
            caption.remove(); // cleanup this processed element
        });
    }
}

export function readImageAttributesFromNode(node) {
    const attrs = {};

    if (node.src) {
        attrs.src = node.src;
    }

    if (node.width) {
        attrs.width = node.width;
    } else if (node.dataset && node.dataset.width) {
        attrs.width = parseInt(node.dataset.width, 10);
    }

    if (node.height) {
        attrs.height = node.height;
    } else if (node.dataset && node.dataset.height) {
        attrs.height = parseInt(node.dataset.height, 10);
    }

    if ((!node.width && !node.height) && node.getAttribute('data-image-dimensions')) {
        const [, width, height] = (/^(\d*)x(\d*)$/gi).exec(node.getAttribute('data-image-dimensions'));
        attrs.width = parseInt(width, 10);
        attrs.height = parseInt(height, 10);
    }

    if (node.alt) {
        attrs.alt = node.alt;
    }

    if (node.title) {
        attrs.title = node.title;
    }

    if (node.parentNode.tagName === 'A') {
        const href = node.parentNode.href;

        if (href !== attrs.src) {
            attrs.href = href;
        }
    }

    return attrs;
}
