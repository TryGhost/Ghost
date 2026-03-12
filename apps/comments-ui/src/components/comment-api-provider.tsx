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

export type MemberOverlay = {
    member: {
        uuid: string;
        name: string;
        expertise: string | null;
        avatar_image: string | null;
        can_comment: boolean;
        paid: boolean;
    };
    liked_comments: string[];
    authored_comments: string[];
};

type CommentApiContextType = {
    commentApi: CommentApi;
    member: Member | null;
    labs: LabsContextType;
    supportEmail: string | null;
    memberOverlay: MemberOverlay | null;
    memberOverlayLoaded: boolean;
    settingsLoaded: boolean;
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
    postId: string;
};

export function CommentApiProvider({children, api, adminUrl, postId}: CommentApiProviderProps) {
    const [labs, setLabs] = useState<LabsContextType>({});
    const [supportEmail, setSupportEmail] = useState<string | null>(null);
    const [settingsLoaded, setSettingsLoaded] = useState(false);
    const [adminApi, setAdminApi] = useState<AdminApi | null | undefined>(adminUrl ? undefined : null);
    const [hasAdminSession, setHasSession] = useState<boolean | undefined>(adminUrl ? undefined : false);
    const [memberOverlay, setMemberOverlay] = useState<MemberOverlay | null>(null);
    const [memberOverlayLoaded, setMemberOverlayLoaded] = useState(false);

    // Step 1: Fetch site settings (labs, support email) — non-blocking
    useEffect(() => {
        api.init()
            .then(({labs: initLabs, supportEmail: initSupportEmail}) => {
                setLabs(initLabs);
                setSupportEmail(initSupportEmail);
                setSettingsLoaded(true);
            })
            .catch((e) => {
                // eslint-disable-next-line no-console
                console.error(`[Comments] Failed to initialize settings:`, e);
                setSettingsLoaded(true);
            });
    }, [api]);

    // Step 2: Fetch member overlay data (lightweight, parallel with everything else)
    useEffect(() => {
        api.comments.memberInfo({postId})
            .then((data) => {
                setMemberOverlay(data);
                setMemberOverlayLoaded(true);
            })
            .catch(() => {
                setMemberOverlayLoaded(true);
            });
    }, [api, postId]);

    // Step 3: Preflight check for admin session
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

    // Step 4: If session exists, verify admin role when iframe loads
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

    // Build member from overlay data for the context
    const member: Member | null = useMemo(() => {
        if (!memberOverlay) {
            return null;
        }
        return {
            uuid: memberOverlay.member.uuid,
            name: memberOverlay.member.name,
            expertise: memberOverlay.member.expertise,
            avatar_image: memberOverlay.member.avatar_image,
            can_comment: memberOverlay.member.can_comment,
            paid: memberOverlay.member.paid
        };
    }, [memberOverlay]);

    // CommentApi: starts as public, upgrades to admin when admin auth resolves
    const commentApi = useMemo(() => {
        const resolvedAdminApi = adminApi !== undefined ? adminApi : null;
        return createCommentApi(api, resolvedAdminApi, member?.uuid);
    }, [api, adminApi, member?.uuid]);

    const contextValue = useMemo(() => {
        return {
            commentApi,
            member,
            labs,
            supportEmail,
            memberOverlay,
            memberOverlayLoaded,
            settingsLoaded
        };
    }, [commentApi, member, labs, supportEmail, memberOverlay, memberOverlayLoaded, settingsLoaded]);

    return (
        <>
            {hasAdminSession && <AuthFrame adminUrl={adminUrl!} onError={onAdminAuthError} onLoad={onAdminAuthLoad} />}
            <CommentApiContext.Provider value={contextValue}>
                {children}
            </CommentApiContext.Provider>
        </>
    );
}
