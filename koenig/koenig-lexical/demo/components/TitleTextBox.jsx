import React from 'react';

const TitleTextBox = ({title, setTitle, editorAPI}) => {
    const titleEl = React.useRef(null);
    React.useEffect(() => {
        if (titleEl.current) {
            titleEl.current.style.height = '58px';
            titleEl.current.style.height = titleEl.current.scrollHeight + 'px';
        }
    }, [title]);

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
            onChange={handleTitleInput}
            onKeyDown={handleTitleKeyDown}
            value={title}
            className="w-full min-w-[auto] mb-3 pb-1 text-black font-sans text-5xl font-bold resize-none overflow-hidden focus-visible:outline-none"
            placeholder="Post title"
            data-testid="post-title" />
    );
};

export default TitleTextBox;
