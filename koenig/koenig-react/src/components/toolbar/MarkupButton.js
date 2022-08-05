import React from 'react';

export default function MarkupButton({editor, tag}) {
    const handleClick = () => {
        editor.toggleMarkup(tag);
    };
    return (
        <button onClick={handleClick}>{tag}</button>
    );
}
