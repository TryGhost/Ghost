import React from 'react';

export const TitleTextBox = React.forwardRef(({title, setTitle, editorAPI}, ref) => {
    const titleEl = React.useRef(null);

    React.useImperativeHandle(ref, () => ({
        focus: () => {
            titleEl.current?.focus();
        }
    }));

    React.useEffect(() => {
        if (titleEl.current) {
            titleEl.current.style.height = '58px';
            titleEl.current.style.height = titleEl.current.scrollHeight + 'px';
        }
    }, [titleEl, title]);

    const handleTitleInput = (e) => {
        setTitle(e.target.value);
    };

    // move cursor to the editor on
    // - Tab
    // - Arrow Down/Right when input is empty or caret at end of input
    // - Enter, creating an empty paragraph when editor is not empty
    const handleTitleKeyDown = (event) => {
        if (!editorAPI) {
            return;
        }

        const {key} = event;
        const {value, selectionStart} = event.target;

        const couldLeaveTitle = !value || selectionStart === value.length;
        const arrowLeavingTitle = ['ArrowDown', 'ArrowRight'].includes(key) && couldLeaveTitle;

        if (key === 'Enter' || key === 'Tab' || arrowLeavingTitle) {
            event.preventDefault();

            if (key === 'Enter' && !editorAPI.editorIsEmpty()) {
                editorAPI.insertParagraphAtTop({focus: true});
            } else {
                editorAPI.focusEditor({position: 'top'});
            }
        }
    };

    return (
        <textarea
            ref={titleEl}
            className="mb-3 w-full min-w-[auto] resize-none overflow-hidden pb-1 font-sans text-5xl font-bold text-black focus-visible:outline-none"
            data-testid="post-title"
            placeholder="Post title"
            value={title}
            onChange={handleTitleInput}
            onKeyDown={handleTitleKeyDown} />
    );
});

TitleTextBox.displayName = 'TitleTextBox';

export default TitleTextBox;
