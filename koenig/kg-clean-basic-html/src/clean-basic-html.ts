export interface CleanBasicHtmlOptions {
    allowBr?: boolean;
    firstChildInnerContent?: boolean;
    removeCodeWrappers?: boolean;
    createDocument?: (html: string) => Document;
}

function removeCodeWrappers(html: string): string {
    return html.replace(/<code\b[^>]*>((.*?){.*?}(.*?))<\/code>/gi, '$1');
}

export function cleanBasicHtml(html: string = '', _options: CleanBasicHtmlOptions = {}): string {
    const defaults = {};
    const options: CleanBasicHtmlOptions = Object.assign({}, defaults, _options);

    if (!options.createDocument) {
        const Parser = (typeof DOMParser !== 'undefined' && DOMParser) || (typeof window !== 'undefined' && window.DOMParser);

        if (!Parser) {
            throw new Error('cleanBasicHtml() must be passed a `createDocument` function as an option when used in a non-browser environment');
        }

        options.createDocument = function (docHtml: string): Document {
            const parser = new Parser();
            return parser.parseFromString(docHtml, 'text/html');
        };
    }

    let cleanHtml: string = html;

    if (!options.allowBr || cleanHtml === '<br>') {
        cleanHtml = cleanHtml
            .replace(/<br\s?\/?>/g, ' ');
    }

    if (options.removeCodeWrappers) {
        cleanHtml = removeCodeWrappers(cleanHtml);
    }

    cleanHtml = cleanHtml
        .replace(/(\s|&nbsp;){2,}/g, ' ')
        .trim()
        .replace(/^&nbsp;|&nbsp$/g, '')
        .trim();

    // remove any elements that have a blank textContent
    if (cleanHtml) {
        const doc = options.createDocument(cleanHtml);

        // don't analyze the document if it's empty (can result in storing <br> tags if allowed)
        if (doc.body.textContent === '') {
            return '';
        }

        doc.body.querySelectorAll('*').forEach((element) => {
            // Treat Zero Width Non-Joiner characters as spaces
            if (!element.textContent?.trim().replace(/\u200c+/g, '')) {
                if (options.allowBr && element.tagName === 'BR') {
                    // keep it
                    return;
                }
                if (options.allowBr && element.querySelector('br')) {
                    return element.replaceWith(doc.createElement('br'));
                }
                if (element.textContent && element.textContent.length > 0) {
                    // keep a single space to avoid collapsing spaces
                    const space = doc.createTextNode(' ');
                    return element.replaceWith(space);
                }
                return element.remove();
            }
        });

        if (options.firstChildInnerContent && doc.body.firstElementChild) {
            cleanHtml = doc.body.firstElementChild.innerHTML.trim();
        } else {
            cleanHtml = doc.body.innerHTML.trim();
        }
    }

    return cleanHtml;
}
