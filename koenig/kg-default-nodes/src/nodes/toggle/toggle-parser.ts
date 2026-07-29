import type {LexicalNode} from 'lexical';

function conversionForToggleCard(ToggleNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        conversion(domNode: HTMLElement) {
            const headingNode = domNode.querySelector('.kg-toggle-heading-text');
            let heading = headingNode?.textContent ?? '';

            if (domNode.tagName === 'DETAILS' && headingNode) {
                const headingContent = headingNode.cloneNode(true) as HTMLElement;
                headingContent.querySelector('.kg-toggle-card-icon')?.remove();
                heading = headingContent.textContent?.trim() ?? '';
            }

            const contentNode = domNode.querySelector('.kg-toggle-content');
            const content = contentNode?.textContent ?? '';

            const payload: Record<string, unknown> = {
                heading,
                content
            };

            const node = new ToggleNode(payload);
            return {node};
        },
        priority: 1 as const
    };
}

export function parseToggleNode(ToggleNode: new (data: Record<string, unknown>) => LexicalNode) {
    const isToggleCard = (nodeElem: HTMLElement) => nodeElem.classList?.contains('kg-toggle-card');

    return {
        details: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'DETAILS' && isToggleCard(nodeElem)) {
                return conversionForToggleCard(ToggleNode);
            }
            return null;
        },
        div: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'DIV' && isToggleCard(nodeElem)) {
                return conversionForToggleCard(ToggleNode);
            }
            return null;
        }
    };
}
