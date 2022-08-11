import React from 'react';

export default function SectionButton({editor, tag, tagsInUse, title}) {
    const handleClick = () => {
        editor.toggleSection(tag);
    };

    return (
        <li className='m-0 flex p-0 first:m-0'>
            <button className={tagsInUse ? 'flex h-9 w-9 items-center justify-center fill-green' : 'flex h-9 w-9 items-center justify-center fill-white'} onClick={handleClick}>
                {title}
            </button>
        </li>
    );
}
