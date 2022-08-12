import React from 'react';

export default function LinkButton({tagsInUse, title, showUrlPrompt, toolbar, selectedRange, cachedRange}) {
    const handleClick = () => {
        cachedRange.setCachedRange(selectedRange);
        showUrlPrompt.setShowUrlPrompt(true);
        toolbar.setShowToolbar(false);
    };

    return (
        <li className='m-0 inline p-0 first:m-0'>
            <button className={tagsInUse ? 'font-bold' : ''} onClick={handleClick}>
                {title}
            </button>
        </li>
    );
}
