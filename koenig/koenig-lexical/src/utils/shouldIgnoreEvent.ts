// util to avoid processing events in Koenig when they originate from an editor
// element inside a card
export const shouldIgnoreEvent = (event) => {
    if (!event) {
        return false;
    }

    const {metaKey, key, target} = event;
    const isEscape = key === 'Escape';
    const isMetaEnter = metaKey && key === 'Enter';

    // we want to allow some keys presses to pass through as we
    // always override them to toggle card editing mode
    if (isEscape || isMetaEnter) {
        return false;
    }

    // Check for standard form inputs and CodeMirror editors.
    // For cut events, CodeMirror may process the event first and remove the
    // target element from the DOM before the event bubbles to Lexical, so
    // target.closest('.cm-editor') would return null. Fall back to checking
    // document.activeElement when the target is disconnected.
    const isFromCardEditor = target.matches('input, textarea')
        || !!target.closest('.cm-editor')
        || (!target.isConnected && !!document.activeElement?.closest('.cm-editor'));

    return isFromCardEditor;
};
