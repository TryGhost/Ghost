import React from 'react';

const CommentsLayout: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <div className="flex h-full flex-col">
            {children}
        </div>
    );
};

export default CommentsLayout;
