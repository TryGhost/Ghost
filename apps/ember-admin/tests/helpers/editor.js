import {click, find, settled, waitFor, waitUntil} from '@ember/test-helpers';

export const titleSelector = '[data-test-editor-title-input]';
export const editorSelector = '[data-secondary-instance="false"] [data-lexical-editor]';

export const pasteInEditor = async (text) => {
    await waitFor(editorSelector);
    await click(editorSelector);
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    document.activeElement.dispatchEvent(new ClipboardEvent('paste', {clipboardData: dataTransfer, bubbles: true, cancelable: true}));
    dataTransfer.clearData();
    const editor = find(editorSelector);
    await waitUntil(() => editor.textContent.includes(text));
    await settled();
};
