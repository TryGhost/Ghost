import React from 'react';

const CommentsContent: React.FC<{children: React.ReactNode}> = ({children}) => {
    return (
        <div className="flex-1 overflow-auto px-6 py-4">
            {children}
        </div>
    );
};

export default CommentsContent;
