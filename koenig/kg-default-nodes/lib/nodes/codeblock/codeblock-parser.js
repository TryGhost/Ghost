import {readCaptionFromElement} from '../../utils/read-caption-from-element';

export function parseCodeBlockNode(CodeBlockNode) {
    return {
        figure: (nodeElem) => {
            const pre = nodeElem.querySelector('pre');
            if (nodeElem.tagName === 'FIGURE' && pre) {
                return {
                    conversion(domNode) {        
                        let code = pre.querySelector('code');
                        let figcaption = domNode.querySelector('figcaption');
    
                        // if there's no caption the pre key should pick it up
                        if (!code || !figcaption) {
                            return null;
                        }
    
                        let payload = {
                            code: code.textContent,
                            caption: readCaptionFromElement(domNode)
                        };
    
                        let preClass = pre.getAttribute('class') || '';
                        let codeClass = code.getAttribute('class') || '';
                        let langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
                        let languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);
                        if (languageMatches) {
                            payload.language = languageMatches[1].toLowerCase();
                        }
    
                        const node = new CodeBlockNode(payload);
                        return {node};
                    },
                    priority: 2 // falls back to pre if no caption
                };
            }
            return null;
        },
        pre: () => ({
            conversion(domNode) {
                if (domNode.tagName === 'PRE') {
                    let [codeElement] = domNode.children;

                    if (codeElement && codeElement.tagName === 'CODE') {
                        let payload = {code: codeElement.textContent};
                        let preClass = domNode.getAttribute('class') || '';
                        let codeClass = codeElement.getAttribute('class') || '';
                        let langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
                        let languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);
                        if (languageMatches) {
                            payload.language = languageMatches[1].toLowerCase();
                        }
                        const node = new CodeBlockNode(payload);
                        return {node};
                    }
                }

                return null;
            },
            priority: 1
        })
    };
}
