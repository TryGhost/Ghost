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
