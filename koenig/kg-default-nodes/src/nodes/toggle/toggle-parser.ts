import type {LexicalNode} from 'lexical';

export function parseToggleNode(ToggleNode: new (data: Record<string, unknown>) => LexicalNode) {
    return {
        div: (nodeElem: HTMLElement) => {
            const isKgToggleCard = nodeElem.classList?.contains('kg-toggle-card');
            if (nodeElem.tagName === 'DIV' && isKgToggleCard) {
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
            return null;
        }
    };
}
