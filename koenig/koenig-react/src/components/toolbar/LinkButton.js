import React from 'react';

export default function LinkButton({tagsInUse, title, showUrlPrompt, toolbar, selectedRange, cachedRange}) {
    const handleClick = () => {
        cachedRange.setCachedRange(selectedRange);
        showUrlPrompt.setShowUrlPrompt(true);
        toolbar.setShowToolbar(false);
    };

    return (
        <li className='m-0 inline p-0 first:m-0'>
            <button className={tagsInUse ? 'flex h-9 w-9 items-center justify-center fill-green' : 'flex h-9 w-9 items-center justify-center fill-white'} onClick={handleClick}>
                {title}
            </button>
        </li>
    );
}
