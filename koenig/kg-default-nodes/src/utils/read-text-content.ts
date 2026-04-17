import {$getRoot} from 'lexical';

// when used nodes are used client-side their data attributes may be an editor
// instance rather than a string in the case of nested editors
export default function readTextContent(node: Record<string, unknown>, property: string) {
    const propertyName = `__${property}`;
    const propertyEditorName = `${propertyName}Editor`;

    // prefer the editor if it exists as the underlying value isn't written until export
    const value = node[propertyEditorName] || node[propertyName];

    if (!value) {
        return '';
    }

    if (typeof value === 'string') {
        return value;
    }

    if (typeof value === 'number') {
        return value.toString();
    }

    if (typeof value === 'object' && value !== null && 'getEditorState' in value && typeof (value as {getEditorState: unknown}).getEditorState === 'function') {
        let text = '';

        (value as {getEditorState: () => {read: (fn: () => void) => void}}).getEditorState().read(() => {
            text = $getRoot().getTextContent();
        });

        return text;
    }

    return '';
}
