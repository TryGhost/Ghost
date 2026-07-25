import type {LexicalNode} from 'lexical';

function conversionForToggleCard(ToggleNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        conversion(domNode: HTMLElement) {
            const headingNode = domNode.querySelector('.kg-toggle-heading-text');
            const heading = headingNode?.innerHTML ?? '';

            const contentNode = domNode.querySelector('.kg-toggle-content');
            const content = contentNode?.innerHTML ?? '';

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
        // Current renderer uses <details class="kg-toggle-card">
        details: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'DETAILS' && isToggleCard(nodeElem)) {
                return conversionForToggleCard(ToggleNode);
            }
            return null;
        },
        // Legacy renderer used <div class="kg-toggle-card" data-kg-toggle-state="...">
        div: (nodeElem: HTMLElement) => {
            if (nodeElem.tagName === 'DIV' && isToggleCard(nodeElem)) {
                return conversionForToggleCard(ToggleNode);
            }
            return null;
        }
    };
}
