import PostsErrorPage from './PostsErrorPage';
import React from 'react';

class PostsErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, error?: Error}> {
    constructor(props: {children: React.ReactNode}) {
        super(props);
        this.state = {hasError: false};
    }

    static getDerivedStateFromError(error: Error) {
        return {hasError: true, error};
    }

    render() {
        if (this.state.hasError) {
            return <PostsErrorPage error={this.state.error} />;
        }
        return this.props.children;
    }
}

export default PostsErrorBoundary;