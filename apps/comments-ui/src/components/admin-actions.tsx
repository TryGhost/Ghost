import React, {useCallback, useContext, useMemo} from 'react';
import {Comment, EditableAppContext} from '../app-context';
import type {CommentApi} from './comment-api-provider';

export type AdminActions = {
    hideComment(id: string): Promise<void>;
    showComment(id: string): Promise<void>;
};

const AdminActionsContext = React.createContext<AdminActions | null>(null);

export const useAdminActions = (): AdminActions | null => useContext(AdminActionsContext);

type Props = {
    commentApi: CommentApi | null;
    setState: (updater: (state: EditableAppContext) => Partial<EditableAppContext>) => void;
    children: React.ReactNode;
};

function updateCommentInState(comments: Comment[], commentId: string, updater: (comment: Comment) => Comment): Comment[] {
    return comments.map((c) => {
        const replies = c.replies.map(r => (r.id === commentId ? updater(r) : r));

        if (c.id === commentId) {
            return updater({...c, replies});
        }

        return {...c, replies};
    });
}

export const AdminActionsProvider: React.FC<Props> = ({commentApi, setState, children}) => {
    const hideComment = useCallback(async (id: string) => {
        if (!commentApi?.isAdmin) {
            return;
        }
        await commentApi.hideComment(id);
        setState(state => ({
            comments: updateCommentInState(state.comments, id, c => ({...c, status: 'hidden'})),
            commentCount: state.commentCount - 1
        }));
    }, [commentApi, setState]);

    const showComment = useCallback(async (id: string) => {
        if (!commentApi?.isAdmin) {
            return;
        }
        await commentApi.showComment({id});
        const data = await commentApi.read(id);
        const updatedComment = data.comments[0];
        setState(state => ({
            comments: updateCommentInState(state.comments, id, () => updatedComment),
            commentCount: state.commentCount + 1
        }));
    }, [commentApi, setState]);

    const actions = useMemo<AdminActions | null>(() => {
        if (!commentApi?.isAdmin) {
            return null;
        }
        return {hideComment, showComment};
    }, [commentApi, hideComment, showComment]);

    return (
        <AdminActionsContext.Provider value={actions}>
            {children}
        </AdminActionsContext.Provider>
    );
};
