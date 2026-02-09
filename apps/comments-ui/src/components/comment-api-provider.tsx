import React, {createContext, useCallback, useContext, useMemo, useState} from 'react';
import {AddComment, Comment, Member} from '../app-context';
import {AdminApi, setupAdminAPI} from '../utils/admin-api';
import {GhostApi} from '../utils/api';

type BaseCommentApi = {
    browse(params: {page: number; postId: string; order?: string}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    replies(params: {commentId: string; afterReplyId?: string; limit?: number | 'all'}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    read(commentId: string): Promise<{comments: Comment[]}>;
    count(params: {postId: string | null}): Promise<any>;

    add(params: {comment: AddComment}): Promise<{comments: Comment[]}>;
    edit(params: {comment: Partial<Comment> & {id: string}}): Promise<{comments: Comment[]}>;
    like(params: {comment: {id: string}}): Promise<string>;
    unlike(params: {comment: {id: string}}): Promise<string>;
    report(params: {comment: {id: string}}): Promise<string>;

    updateMember(data: {name?: string; expertise?: string}): Promise<Member | null>;
};

export type MemberCommentApi = BaseCommentApi & {isAdmin: false};

export type AdminCommentApi = BaseCommentApi & {
    isAdmin: true;
    hideComment(id: string): Promise<any>;
    showComment(params: {id: string}): Promise<any>;
};

export type CommentApi = MemberCommentApi | AdminCommentApi;

export function createCommentApi(api: GhostApi, adminApi: AdminApi | null, memberUuid?: string): CommentApi {
    if (adminApi) {
        return {
            isAdmin: true,
            browse: p => adminApi.browse({...p, memberUuid}),
            replies: p => adminApi.replies({...p, memberUuid}),
            read: id => adminApi.read({commentId: id, memberUuid}),
            count: p => api.comments.count(p),
            add: p => api.comments.add(p),
            edit: p => api.comments.edit(p),
            like: p => api.comments.like(p),
            unlike: p => api.comments.unlike(p),
            report: p => api.comments.report(p),
            updateMember: data => api.member.update(data),
            hideComment: id => adminApi.hideComment(id),
            showComment: p => adminApi.showComment(p)
        };
    }

    return {
        isAdmin: false,
        browse: p => api.comments.browse(p),
        replies: p => api.comments.replies(p),
        read: id => api.comments.read(id),
        count: p => api.comments.count(p),
        add: p => api.comments.add(p),
        edit: p => api.comments.edit(p),
        like: p => api.comments.like(p),
        unlike: p => api.comments.unlike(p),
        report: p => api.comments.report(p),
        updateMember: data => api.member.update(data)
    };
}

const ALLOWED_MODERATORS = ['Owner', 'Administrator', 'Super Editor'];

type CommentApiContextType = {
    commentApi: CommentApi;
    isAdmin: boolean;
    adminUrl: string | undefined;
    initAdminAuth: (memberUuid?: string) => Promise<void>;
};

export const CommentApiContext = createContext<CommentApiContextType | null>(null);

export function useCommentApi(): CommentApiContextType {
    const context = useContext(CommentApiContext);
    if (!context) {
        throw new Error('useCommentApi must be used within a CommentApiProvider');
    }
    return context;
}

type CommentApiProviderProps = {
    children: React.ReactNode;
    api: GhostApi;
    adminUrl: string | undefined;
};

export function CommentApiProvider({
    children,
    api,
    adminUrl
}: CommentApiProviderProps) {
    const [adminApi, setAdminApi] = useState<AdminApi | null>(null);
    const [memberUuid, setMemberUuid] = useState<string | undefined>(undefined);

    const initAdminAuth = useCallback(async (currentMemberUuid?: string): Promise<void> => {
        if (!adminUrl || adminApi) {
            return;
        }

        setMemberUuid(currentMemberUuid);

        try {
            const newAdminApi = setupAdminAPI({adminUrl});

            try {
                const admin = await newAdminApi.getUser();

                if (admin?.roles?.some((role: {name: string}) => ALLOWED_MODERATORS.includes(role.name))) {
                    setAdminApi(newAdminApi);
                }
            } catch (e) {
                // eslint-disable-next-line no-console
                console.warn(`[Comments] Failed to fetch admin endpoint:`, e);
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.error(`[Comments] Failed to initialize admin authentication:`, e);
        }
    }, [adminUrl, adminApi]);

    const commentApi = useMemo(() => {
        return createCommentApi(api, adminApi, memberUuid);
    }, [api, adminApi, memberUuid]);

    const contextValue = useMemo(() => ({
        commentApi,
        isAdmin: commentApi.isAdmin,
        adminUrl,
        initAdminAuth
    }), [commentApi, adminUrl, initAdminAuth]);

    return (
        <CommentApiContext.Provider value={contextValue}>
            {children}
        </CommentApiContext.Provider>
    );
}
