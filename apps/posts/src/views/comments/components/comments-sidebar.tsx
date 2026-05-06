import React from 'react';

const CommentsSidebar: React.FC<React.PropsWithChildren> = ({children}) => {
    return (
        <aside className='px-4 pt-4 lg:sticky lg:top-0 lg:col-start-2 lg:row-start-1 lg:max-h-screen lg:w-[460px] lg:self-start lg:overflow-y-auto lg:border-l lg:border-border lg:px-8 lg:pt-8'>
            {children}
        </aside>
    );
};

export default CommentsSidebar;
