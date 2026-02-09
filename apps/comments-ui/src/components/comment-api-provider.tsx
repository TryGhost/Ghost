import AuthFrame from '../auth-frame';
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {AddComment, Comment, LabsContextType, Member} from '../app-context';
import {AdminApi, setupAdminAPI} from '../utils/admin-api';
import {GhostApi} from '../utils/api';

async function checkHasAdminSession(adminUrl: string): Promise<boolean> {
    try {
        const response = await fetch(adminUrl + 'auth-frame/', {
            method: 'HEAD',
            credentials: 'include'
        });
        return response.ok && response.status !== 204;
    } catch {
        return false;
    }
}

type BaseCommentApi = {
    browse(params: {page: number; postId: string; order?: string}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    replies(params: {commentId: string; afterReplyId?: string; limit?: number}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
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

const ALLOWED_MODERATORS = ['Owner', 'Administrator', 'Super Editor'];

function createCommentApi(api: GhostApi, adminApi: AdminApi | null, memberUuid?: string): CommentApi {
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

type MemberData = {
    member: Member | null;
    labs: LabsContextType;
    supportEmail: string | null;
};

type CommentApiContextType = {
    commentApi: CommentApi;
    member: Member | null;
    labs: LabsContextType;
    supportEmail: string | null;
};

const CommentApiContext = createContext<CommentApiContextType | null>(null);

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

export function CommentApiProvider({children, api, adminUrl}: CommentApiProviderProps) {
    // undefined = pending, value = resolved
    const [memberData, setMemberData] = useState<MemberData | undefined>(undefined);
    const [adminApi, setAdminApi] = useState<AdminApi | null | undefined>(adminUrl ? undefined : null);
    const [hasAdminSession, setHasSession] = useState<boolean | undefined>(adminUrl ? undefined : false);

    // Step 1: Initialize member data
    useEffect(() => {
        api.init()
            .then(setMemberData)
            .catch((e) => {
                // eslint-disable-next-line no-console
                console.error(`[Comments] Failed to initialize member:`, e);
                setMemberData({member: null, labs: {}, supportEmail: null});
            });
    }, [api]);

    // Step 2: Preflight check for admin session
    useEffect(() => {
        if (!adminUrl) {
            return;
        }
        checkHasAdminSession(adminUrl).then((result) => {
            setHasSession(result);
            if (!result) {
                setAdminApi(null);
            }
        });
    }, [adminUrl]);

    // Step 3: If session exists, verify admin role when iframe loads
    const onAdminAuthLoad = async () => {
        try {
            const newAdminApi = setupAdminAPI({adminUrl: adminUrl!});
            const admin = await newAdminApi.getUser();
            const isAllowed = admin?.roles?.some((role: {name: string}) => ALLOWED_MODERATORS.includes(role.name));
            setAdminApi(isAllowed ? newAdminApi : null);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`[Comments] Admin auth failed:`, e);
            setAdminApi(null);
        }
    };

    const onAdminAuthError = () => {
        // eslint-disable-next-line no-console
        console.warn(`[Comments] Admin auth frame failed to load`);
        setAdminApi(null);
    };

    const resolved = memberData !== undefined && adminApi !== undefined;

    const contextValue = useMemo(() => {
        if (!resolved) {
            return null;
        }
        return {
            commentApi: createCommentApi(api, adminApi, memberData.member?.uuid),
            member: memberData.member,
            labs: memberData.labs,
            supportEmail: memberData.supportEmail
        };
    }, [resolved, api, adminApi, memberData]);

    return (
        <>
            {hasAdminSession && <AuthFrame adminUrl={adminUrl!} onError={onAdminAuthError} onLoad={onAdminAuthLoad} />}
            {contextValue && (
                <CommentApiContext.Provider value={contextValue}>
                    {children}
                </CommentApiContext.Provider>
            )}
        </>
    );
}
