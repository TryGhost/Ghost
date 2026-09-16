import type {LexicalNode} from 'lexical';
import {readCaptionFromElement} from '../../utils/read-caption-from-element.js';

export function parseCodeBlockNode(CodeBlockNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        figure: (nodeElem: HTMLElement) => {
            const pre = nodeElem.querySelector('pre');
            if (nodeElem.tagName === 'FIGURE' && pre) {
                return {
                    conversion(domNode: HTMLElement) {
                        const code = pre.querySelector('code');
                        const figcaption = domNode.querySelector('figcaption');

                        // if there's no caption the pre key should pick it up
                        if (!code || !figcaption) {
                            return null;
                        }

                        const payload: Record<string, unknown> = {
                            code: code.textContent,
                            caption: readCaptionFromElement(domNode)
                        };

                        const preClass = pre.getAttribute('class') || '';
                        const codeClass = code.getAttribute('class') || '';
                        const langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
                        const languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);
                        if (languageMatches) {
                            payload.language = languageMatches[1].toLowerCase();
                        }

                        const node = new CodeBlockNode(payload);
                        return {node};
                    },
                    priority: 2 as const // falls back to pre if no caption
                };
            }
            return null;
        },
        pre: () => ({
            conversion(domNode: HTMLElement) {
                if (domNode.tagName === 'PRE') {
                    const [codeElement] = domNode.children;

                    if (codeElement && codeElement.tagName === 'CODE') {
                        const payload: Record<string, unknown> = {code: codeElement.textContent};
                        const preClass = domNode.getAttribute('class') || '';
                        const codeClass = codeElement.getAttribute('class') || '';
                        const langRegex = /lang(?:uage)?-(.*?)(?:\s|$)/i;
                        const languageMatches = preClass.match(langRegex) || codeClass.match(langRegex);
                        if (languageMatches) {
                            payload.language = languageMatches[1].toLowerCase();
                        }
                        const node = new CodeBlockNode(payload);
                        return {node};
                    }
                }

                return null;
            },
            priority: 1 as const
        })
    };
}
