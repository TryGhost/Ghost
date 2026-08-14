// Structurally matches admin-x-design-system's KoenigInstance so instances typed
// against either package interoperate.
export type KoenigInstance = {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [key: string]: any
    editorInstance: {
        getRootElement: () => HTMLElement | null
    }
    focusEditor: (options?: {position?: 'top' | 'bottom'}) => void
    insertParagraphAtBottom: () => void
    lastNodeIsDecorator: () => boolean
};

export function focusKoenigEditorOnBottomClick(
    editorAPI: KoenigInstance,
    event: Pick<MouseEvent, 'clientY' | 'pageY' | 'preventDefault'>
) {
    const editorCanvas = editorAPI.editorInstance.getRootElement();

    if (!editorCanvas) {
        return;
    }

    const {bottom} = editorCanvas.getBoundingClientRect();

    // If a mousedown and subsequent mouseup occurs below the editor
    // canvas, focus the editor and put the cursor at the end of the document.
    if (event.pageY > bottom && event.clientY > bottom) {
        event.preventDefault();

        // We should always have a visible cursor when focusing at the bottom
        // so create an empty paragraph if the last section is a card.
        if (editorAPI.lastNodeIsDecorator()) {
            editorAPI.insertParagraphAtBottom();
        }

        editorAPI.focusEditor({position: 'bottom'});
    }
}
