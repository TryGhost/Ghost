import React from 'react';

export default function MarkupButton({editor, tag, markupTags, title}) {
    const handleClick = () => {
        editor.toggleMarkup(tag);
    };

    return (
        <li className='m-0 inline p-0 first:m-0'>
            <button className={markupTags ? 'font-bold' : ''} onClick={handleClick}>
                {title}
            </button>
        </li>
    );
}
