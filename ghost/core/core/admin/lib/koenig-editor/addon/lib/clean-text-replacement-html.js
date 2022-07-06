export default function cleanTextReplacementHtml(html = '', _options = {}) {
    const defaults = {};
    const options = Object.assign({}, defaults, _options);

    if (!options.createDocument) {
        const Parser = (typeof DOMParser !== 'undefined' && DOMParser) || (typeof window !== 'undefined' && window.DOMParser);

        if (!Parser) {
            throw new Error('cleanTextReplacementHtml() must be passed a `createDocument` function as an option when used in a non-browser environment');
        }

        options.createDocument = function (documentHtml) {
            const parser = new Parser();
            return parser.parseFromString(documentHtml, 'text/html');
        };
    }

    let cleanHtml = html
        .replace(/<code>({.*?})<\/code>/gi, '$1')
        .trim()
        .replace(/^&nbsp;|&nbsp$/g, '')
        .trim();

    // remove any elements that have a blank textContent
    if (cleanHtml) {
        let doc = options.createDocument(cleanHtml);

        doc.body.querySelectorAll('*').forEach((element) => {
            if (!element.textContent.trim()) {
                if (element.textContent.length > 0) {
                    // keep a single space to avoid collapsing spaces
                    let space = doc.createTextNode(' ');
                    element.replaceWith(space);
                } else {
                    element.remove();
                }
            }
        });

        cleanHtml = doc.body.innerHTML.trim();
    }

    return cleanHtml;
}
