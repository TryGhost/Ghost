import React, {useContext, useMemo} from 'react';
import {Comment, EditableAppContext} from '../app-context';
import type {AdminCommentApi, CommentApi} from './comment-api-provider';

export type AdminActions = {
    hideComment(id: string): Promise<void>;
    showComment(id: string): Promise<void>;
};

const AdminActionsContext = React.createContext<AdminActions | undefined>(undefined);

export function useAdminActions(): AdminActions {
    const context = useContext(AdminActionsContext);
    if (context === undefined) {
        throw new Error('useAdminActions must be used within an admin context');
    }
    return context;
}

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

function buildAdminActions(commentApi: AdminCommentApi, setState: Props['setState']): AdminActions {
    return {
        async hideComment(id: string) {
            await commentApi.hideComment(id);
            setState(state => ({
                comments: updateCommentInState(state.comments, id, c => ({...c, status: 'hidden'})),
                commentCount: state.commentCount - 1
            }));
        },
        async showComment(id: string) {
            await commentApi.showComment({id});
            const data = await commentApi.read(id);
            const updatedComment = data.comments[0];
            setState(state => ({
                comments: updateCommentInState(state.comments, id, () => updatedComment),
                commentCount: state.commentCount + 1
            }));
        }
    };
}

export const AdminActionsProvider: React.FC<Props> = ({commentApi, setState, children}) => {
    const actions = useMemo<AdminActions | undefined>(() => {
        if (!commentApi?.isAdmin) {
            return undefined;
        }
        return buildAdminActions(commentApi, setState);
    }, [commentApi, setState]);

    return (
        <AdminActionsContext.Provider value={actions}>
            {children}
        </AdminActionsContext.Provider>
    );
};
