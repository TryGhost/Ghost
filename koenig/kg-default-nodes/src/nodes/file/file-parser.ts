import type {LexicalNode} from 'lexical';
import {sizeToBytes} from '../../utils/size-byte-converter.js';

export function parseFileNode(FileNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        div: (nodeElem: HTMLElement) => {
            const isKgFileCard = nodeElem.classList?.contains('kg-file-card');
            if (nodeElem.tagName === 'DIV' && isKgFileCard) {
                return {
                    conversion(domNode: HTMLElement) {
                        const link = domNode.querySelector('a');
                        const src = link?.getAttribute('href') ?? '';
                        const fileTitle = domNode.querySelector('.kg-file-card-title')?.textContent || '';
                        const fileCaption = domNode.querySelector('.kg-file-card-caption')?.textContent || '';
                        const fileName = domNode.querySelector('.kg-file-card-filename')?.textContent || '';
                        const fileSize = sizeToBytes(domNode.querySelector('.kg-file-card-filesize')?.textContent || '');
                        const payload: Record<string, unknown> = {
                            src,
                            fileTitle,
                            fileCaption,
                            fileName,
                            fileSize
                        };

                        const node = new FileNode(payload);
                        return {node};
                    },
                    priority: 1 as const
                };
            }
            return null;
        }
    };
}
