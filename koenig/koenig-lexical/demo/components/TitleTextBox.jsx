import React from 'react';

const TitleTextBox = ({handleTitleInput, title}) => {
    const titleEl = React.useRef(null);
    React.useEffect(() => {
        if (titleEl.current) {
            titleEl.current.style.height = '64px';
            titleEl.current.style.height = titleEl.current.scrollHeight + 'px';
        }
    }, [title]);

    // prevent default enter key behavior

    const handleTitleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
        }
    };
    
    return (
        <textarea
            onKeyDown={handleTitleKeyDown}
            ref={titleEl} 
            onChange={handleTitleInput}
            value={title} 
            className="w-full min-w-[auto] mb-3 pb-1 text-black font-sans text-5xl font-bold resize-none overflow-hidden focus-visible:outline-none" 
            placeholder="Post title" />
    );
};

export default TitleTextBox;
