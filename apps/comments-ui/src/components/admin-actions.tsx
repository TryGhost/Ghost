import React, {createContext, useCallback, useContext, useMemo} from 'react';
import {AdminCommentApi, useCommentApi} from './comment-api-provider';
import {Comment, EditableAppContext} from '../app-context';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type AdminActions = {
    hideComment: (comment: Comment) => Promise<void>;
    showComment: (comment: Comment) => Promise<void>;
};

// ---------------------------------------------------------------------------
// State update helpers
// ---------------------------------------------------------------------------

/**
 * Update a comment's status in the comments array (handles both top-level and replies)
 */
function updateCommentStatus(
    comments: Comment[],
    commentId: string,
    updater: (comment: Comment) => Comment
): Comment[] {
    return comments.map((c) => {
        const replies = c.replies.map((r) => {
            if (r.id === commentId) {
                return updater(r);
            }
            return r;
        });

        if (c.id === commentId) {
            return updater({...c, replies});
        }

        return {...c, replies};
    });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const AdminActionsContext = createContext<AdminActions | undefined>(undefined);

export function useAdminActions(): AdminActions {
    const context = useContext(AdminActionsContext);
    if (!context) {
        throw new Error('useAdminActions must be used within an admin context (admin user required)');
    }
    return context;
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

type AdminActionsProviderProps = {
    children: React.ReactNode;
    setState: (updater: (state: EditableAppContext) => Partial<EditableAppContext>) => void;
};

export function AdminActionsProvider({children, setState}: AdminActionsProviderProps) {
    const {commentApi} = useCommentApi();

    const hideComment = useCallback(async (comment: Comment) => {
        const adminApi = commentApi as AdminCommentApi;
        await adminApi.hideComment(comment.id);

        setState(state => ({
            comments: updateCommentStatus(state.comments, comment.id, c => ({
                ...c,
                status: 'hidden'
            })),
            commentCount: state.commentCount - 1
        }));
    }, [commentApi, setState]);

    const showComment = useCallback(async (comment: Comment) => {
        const adminApi = commentApi as AdminCommentApi;
        await adminApi.showComment({id: comment.id});

        // Refetch the comment to get up-to-date HTML content
        const data = await adminApi.read(comment.id);
        const updatedComment = data.comments[0];

        setState(state => ({
            comments: updateCommentStatus(state.comments, comment.id, () => updatedComment),
            commentCount: state.commentCount + 1
        }));
    }, [commentApi, setState]);

    const actions = useMemo(() => {
        // Only provide actions when admin is authenticated
        if (!commentApi.isAdmin) {
            return undefined;
        }
        return {hideComment, showComment};
    }, [commentApi.isAdmin, hideComment, showComment]);

    return (
        <AdminActionsContext.Provider value={actions}>
            {children}
        </AdminActionsContext.Provider>
    );
}
