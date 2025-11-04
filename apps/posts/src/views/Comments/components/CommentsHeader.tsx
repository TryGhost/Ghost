import React from 'react';

const CommentsHeader: React.FC = () => {
    return (
        <header className="border-b border-border px-6 py-4">
            <h1 className="text-2xl font-bold">Comments</h1>
            <p className="mt-1 text-muted-foreground">
                Manage all comments on your site
            </p>
        </header>
    );
};

export default CommentsHeader;
