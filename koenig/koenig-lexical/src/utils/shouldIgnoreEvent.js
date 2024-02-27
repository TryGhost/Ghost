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

    const isFromCardEditor = target.matches('input, textarea') || target.cmView || target.cmIgnore || !!target.closest('.cm-editor');

    return isFromCardEditor;
};
