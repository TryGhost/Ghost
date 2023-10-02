/**
 * Removes any <code> wrappers around replacement strings {foo}
 * Example input:  <code><span>{foo}</span></code>
 * Example output:       <span>{foo}</span>
 * @param {string} html
 * @returns {string}
 */
function removeCodeWrappers(html) {
    return html.replace(/<code\b[^>]*>((.*?){.*?}(.*?))<\/code>/gi, '$1');
}

/* global DOMParser, window */
/**
 * Parses an html string and returns a cleaned version
 * @param {string} html 
 * @param {Object} _options
 * @param {boolean} [_options.allowBr] - if true, <br> tags will be kept
 * @param {boolean} [_options.firstChildInnerContent] - if true, only the innerHTML of the first element will be returned
 * @param {boolean} [_options.removeCodeWrappers] - if true, <code> wrappers around replacement strings {foo} will be removed
 * @returns {string}
 */
export default function cleanBasicHtml(html = '', _options = {}) {
    const defaults = {};
    const options = Object.assign({}, defaults, _options);

    if (!options.createDocument) {
        const Parser = (typeof DOMParser !== 'undefined' && DOMParser) || (typeof window !== 'undefined' && window.DOMParser);

        if (!Parser) {
            throw new Error('cleanBasicHtml() must be passed a `createDocument` function as an option when used in a non-browser environment');
        }

        options.createDocument = function (docHtml) {
            const parser = new Parser();
            return parser.parseFromString(docHtml, 'text/html');
        };
    }

    let cleanHtml = html;

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
        let doc = options.createDocument(cleanHtml);

        // don't analyze the document if it's empty (can result in storing <br> tags if allowed)
        if (doc.body.textContent === '') {
            return null;
        }

        doc.body.querySelectorAll('*').forEach((element) => {
            // Treat Zero Width Non-Joiner characters as spaces
            if (!element.textContent.trim().replace(/\u200c+/g, '')) {
                if (options.allowBr && element.tagName === 'BR') {
                    // keep it
                    return;
                }
                if (options.allowBr && element.querySelector('br')) {
                    return element.replaceWith(doc.createElement('br'));
                }
                if (element.textContent.length > 0) {
                    // keep a single space to avoid collapsing spaces
                    let space = doc.createTextNode(' ');
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
