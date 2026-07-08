/**
 * Removes consecutive whitespaces and newlines
 */
export function removeSpaces(html: string) {
    return html.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Wraps replacement strings with %%
 * This helps to prevent conflicts between code samples and our replacement strings
 * Example: {foo} -> %%{foo}%%
 */
export function wrapReplacementStrings(html: string) {
    return html.replace(/\{(\w*?)(?:,? *"(.*?)")?\}/g, '%%$&%%');
}

/**
 * Removes any <code> wrappers around replacement strings {foo}
 * Example input:  <code><span>{foo}</span></code>
 * Example output:       <span>{foo}</span>
 */
export function removeCodeWrappersFromHelpers(html: string, document: Document) {
    // parse html to make patterns easier to match
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;

    const codeElements = tempDiv.querySelectorAll('code');
    codeElements.forEach((codeElement) => {
        const codeTextContent = codeElement.textContent;
        // extract the content of the code element if it follows the helper pattern (e.g. {foo})
        if (codeTextContent?.match(/((.*?){.*?}(.*?))/gi)) {
            const codeContent = codeElement.innerHTML;
            codeElement.parentNode?.replaceChild(document.createRange().createContextualFragment(codeContent), codeElement);
        }
    });

    const cleanedHtml = tempDiv.innerHTML;
    return cleanedHtml;
}
