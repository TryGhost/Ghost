import type {KoenigInstance} from '@tryghost/admin-x-design-system';

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
