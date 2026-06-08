import React from 'react';

interface PostsErrorPageProps {
    error?: Error;
}

const PostsErrorPage: React.FC<PostsErrorPageProps> = () => {
    return (
        <div className="admin-x-container-error">
            <div className="admin-x-error">
                <h1>Loading interrupted</h1>
                <p>They say life is a series of trials and tribulations. This moment right here? It&apos;s a tribulation. Our app was supposed to load, and yet here we are. Loadless. Click back to the dashboard to try again.</p>
                <a className="cursor-pointer" onClick={() => window.location.reload()}>&larr; Back to the dashboard</a>
            </div>
        </div>
    );
};

export default PostsErrorPage;