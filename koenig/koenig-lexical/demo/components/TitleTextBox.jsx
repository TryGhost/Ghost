import React from 'react';

const TitleTextBox = ({handleTitleInput, title}) => {
    const titleEl = React.useRef(null);
    React.useEffect(() => {
        if (titleEl.current) {
            titleEl.current.style.height = 'auto';
            titleEl.current.style.height = titleEl.current.scrollHeight + 'px';
        }
    }, [title]);
    
    return (
        <textarea 
            ref={titleEl} 
            onChange={handleTitleInput}
            value={title} 
            className="w-full min-w-[auto] mb-3 pb-1 text-black font-sans text-5xl font-bold resize-none overflow-hidden focus-visible:outline-none" 
            placeholder="Post title" />
    );
};

export default TitleTextBox;
