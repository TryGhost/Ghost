import React from 'react';

interface TitleTextBoxProps {
    title: string;
    setTitle: (title: string) => void;
    editorAPI: {
        editorIsEmpty: () => boolean;
        insertParagraphAtTop: (options: {focus: boolean}) => void;
        focusEditor: (options: {position: string}) => void;
    } | null;
}

export interface TitleTextBoxHandle {
    focus: () => void;
}

export const TitleTextBox = React.forwardRef<TitleTextBoxHandle, TitleTextBoxProps>(({title, setTitle, editorAPI}, ref) => {
    const titleEl = React.useRef<HTMLTextAreaElement>(null);

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

    const handleTitleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTitle(e.target.value);
    };

    // move cursor to the editor on
    // - Tab
    // - Arrow Down/Right when input is empty or caret at end of input
    // - Enter, creating an empty paragraph when editor is not empty
    const handleTitleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (!editorAPI) {
            return;
        }

        const {key} = event;
        const {value, selectionStart} = event.target as HTMLTextAreaElement;

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
            className="mb-3 w-full min-w-[auto] resize-none overflow-hidden bg-transparent pb-1 font-sans text-5xl font-bold text-black focus-visible:outline-none dark:text-white"
            data-testid="post-title"
            placeholder="Post title"
            value={title}
            onChange={handleTitleInput}
            onKeyDown={handleTitleKeyDown} />
    );
});

TitleTextBox.displayName = 'TitleTextBox';

export default TitleTextBox;
