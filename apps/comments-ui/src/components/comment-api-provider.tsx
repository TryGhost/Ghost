import AuthFrame from '../auth-frame';
import React, {useCallback, useContext, useEffect, useMemo, useState} from 'react';
import {AddComment, Comment, LabsContextType, Member} from '../app-context';
import {AdminApi, setupAdminAPI} from '../utils/admin-api';
import {GhostApi} from '../utils/api';

const ALLOWED_MODERATORS = ['Owner', 'Administrator', 'Super Editor'];

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

type CommentApiContextType = {
    resolved: boolean;
    commentApi: CommentApi | null;
    member: Member | null;
    labs: LabsContextType;
    supportEmail: string | null;
};

const CommentApiContext = React.createContext<CommentApiContextType>({
    resolved: false,
    commentApi: null,
    member: null,
    labs: {},
    supportEmail: null
});

export const useCommentApi = () => useContext(CommentApiContext);

type CommentApiProviderProps = {
    api: GhostApi;
    adminUrl: string | undefined;
    children: React.ReactNode;
};

type InitData = {
    member: Member | null;
    labs: LabsContextType;
    supportEmail: string | null;
};

export const CommentApiProvider: React.FC<CommentApiProviderProps> = ({api, adminUrl, children}) => {
    const [initData, setInitData] = useState<InitData | null>(null);
    const [adminApi, setAdminApi] = useState<AdminApi | null | undefined>(
        adminUrl ? undefined : null
    );
    const [showAuthFrame, setShowAuthFrame] = useState(false);

    // Fetch member session + site settings
    useEffect(() => {
        api.init().then(({member, labs, supportEmail}) => {
            setInitData({member, labs, supportEmail});
        }).catch((e) => {
            // eslint-disable-next-line no-console
            console.error(`[Comments] Failed to initialize:`, e);
            setInitData({member: null, labs: {}, supportEmail: null});
        });
    }, [api]);

    // Check if admin auth frame is available before rendering the iframe.
    // A 204 response means the user is not logged in to Ghost admin — skip the iframe.
    // A 200 response means the auth frame is available — render the iframe.
    useEffect(() => {
        if (!adminUrl) {
            return;
        }

        fetch(adminUrl + 'auth-frame/', {credentials: 'include'}).then((res) => {
            if (res.ok && res.status !== 204) {
                setShowAuthFrame(true);
            } else {
                setAdminApi(null);
            }
        }).catch(() => {
            setAdminApi(null);
        });
    }, [adminUrl]);

    // Auth frame load handler — resolves admin status
    const onAdminAuthLoaded = useCallback(async () => {
        if (!adminUrl) {
            return;
        }

        const newAdminApi = setupAdminAPI({adminUrl});

        try {
            const admin = await newAdminApi.getUser();
            const isAllowed = admin?.roles?.some((role: any) => ALLOWED_MODERATORS.includes(role.name));
            setAdminApi(isAllowed ? newAdminApi : null);
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`[Comments] Failed to fetch admin endpoint:`, e);
            setAdminApi(null);
        }
    }, [adminUrl]);

    const resolved = initData !== null && adminApi !== undefined;

    const commentApi = useMemo(() => {
        if (!resolved || !initData) {
            return null;
        }
        return createCommentApi(api, adminApi ?? null, initData.member?.uuid);
    }, [resolved, initData, adminApi, api]);

    const value = useMemo<CommentApiContextType>(() => ({
        resolved,
        commentApi,
        member: initData?.member ?? null,
        labs: initData?.labs ?? {},
        supportEmail: initData?.supportEmail ?? null
    }), [resolved, commentApi, initData]);

    return (
        <CommentApiContext.Provider value={value}>
            {children}
            {showAuthFrame && adminUrl && <AuthFrame adminUrl={adminUrl} onLoad={onAdminAuthLoaded} />}
        </CommentApiContext.Provider>
    );
};
