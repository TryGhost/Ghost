import React from 'react';

export default function MarkupButton({editor, tag, markupTags}) {
    const handleClick = () => {
        editor.toggleMarkup(tag);
    };

    return (
        <button className={markupTags ? 'font-bold' : ''} onClick={handleClick}>{tag}</button>
    );
}
