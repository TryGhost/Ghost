import AuthFrame from '../auth-frame';
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {AddComment, Comment, LabsContextType, Member} from '../app-context';
import {setupAdminAPI} from '../utils/admin-api';
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

export type PublicApi = {
    browse(params: {page: number; postId: string; order?: string}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    replies(params: {commentId: string; afterReplyId?: string; limit?: number | 'all'}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    read(commentId: string): Promise<{comments: Comment[]}>;
    count(params: {postId: string | null}): Promise<any>;
};

export type MemberApi = {
    add(params: {comment: AddComment}): Promise<{comments: Comment[]}>;
    edit(params: {comment: Partial<Comment> & {id: string}}): Promise<{comments: Comment[]}>;
    like(params: {comment: {id: string}}): Promise<string>;
    unlike(params: {comment: {id: string}}): Promise<string>;
    report(params: {comment: {id: string}}): Promise<string>;
    replies(params: {commentId: string; afterReplyId?: string; limit?: number | 'all'}): Promise<{comments: Comment[]; meta: {pagination: any}}>;
    getMember(params: {postId: string}): Promise<any>;
    updateMember(data: {name?: string; expertise?: string}): Promise<Member | null>;
};

export type AdminActions = {
    hideComment(id: string): Promise<any>;
    showComment(params: {id: string}): Promise<any>;
};

const ALLOWED_MODERATORS = ['Owner', 'Administrator', 'Super Editor'];

function createPublicApi(api: GhostApi): PublicApi {
    return {
        browse: p => api.comments.browse(p),
        replies: p => api.comments.replies({...p, credentials: 'omit'}),
        read: id => api.comments.read(id),
        count: p => api.comments.count(p)
    };
}

function createMemberApi(api: GhostApi): MemberApi {
    return {
        add: p => api.comments.add(p),
        edit: p => api.comments.edit(p),
        like: p => api.comments.like(p),
        unlike: p => api.comments.unlike(p),
        report: p => api.comments.report(p),
        replies: p => api.comments.replies({...p, credentials: 'same-origin'}),
        getMember: p => api.comments.getMember(p),
        updateMember: data => api.member.update(data)
    };
}

export type CommentMember = {
    uuid: string;
    name: string;
    expertise: string | null;
    avatar_image: string | null;
    can_comment: boolean;
    paid: boolean;
    liked_comments: string[];
};

type CommentApiContextType = {
    publicApi: PublicApi;
    memberApi: MemberApi;
    isAdmin: boolean;
    adminActions: AdminActions | null;
    member: Member | null;
    labs: LabsContextType;
    supportEmail: string | null;
    commentMember: CommentMember | null;
    commentMemberLoaded: boolean;
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
    const [adminActions, setAdminActions] = useState<AdminActions | null>(null);
    const [hasAdminSession, setHasSession] = useState<boolean | undefined>(adminUrl ? undefined : false);
    const [commentMember, setCommentMember] = useState<CommentMember | null>(null);
    const [commentMemberLoaded, setCommentMemberLoaded] = useState(false);

    // Step 1: Fetch site settings (labs, support email) — non-blocking
    useEffect(() => {
        api.init()
            .then(({labs: initLabs, supportEmail: initSupportEmail}) => {
                setLabs(initLabs);
                setSupportEmail(initSupportEmail);
            })
            .catch((e) => {
                // eslint-disable-next-line no-console
                console.error(`[Comments] Failed to initialize settings:`, e);
            });
    }, [api]);

    // Step 2: Fetch comment member data (lightweight, parallel with everything else)
    useEffect(() => {
        api.comments.getMember({postId})
            .then((data) => {
                if (data) {
                    setCommentMember({
                        uuid: data.member.uuid,
                        name: data.member.name,
                        expertise: data.member.expertise,
                        avatar_image: data.member.avatar_image,
                        can_comment: data.member.can_comment,
                        paid: data.member.paid,
                        liked_comments: data.liked_comments
                    });
                }
                setCommentMemberLoaded(true);
            })
            .catch(() => {
                setCommentMemberLoaded(true);
            });
    }, [api, postId]);

    // Step 3: Preflight check for admin session
    useEffect(() => {
        if (!adminUrl) {
            return;
        }
        checkHasAdminSession(adminUrl).then((result) => {
            setHasSession(result);
        });
    }, [adminUrl]);

    // Step 4: If session exists, verify admin role when iframe loads
    const onAdminAuthLoad = async () => {
        try {
            const newAdminApi = setupAdminAPI({adminUrl: adminUrl!});
            const admin = await newAdminApi.getUser();
            const isAllowed = admin?.roles?.some((role: {name: string}) => ALLOWED_MODERATORS.includes(role.name));
            if (isAllowed) {
                setAdminActions({
                    hideComment: id => newAdminApi.hideComment(id),
                    showComment: p => newAdminApi.showComment(p)
                });
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(`[Comments] Admin auth failed:`, e);
        }
    };

    const onAdminAuthError = () => {
        // eslint-disable-next-line no-console
        console.warn(`[Comments] Admin auth frame failed to load`);
    };

    // Build member from comment member data for the context
    const member: Member | null = useMemo(() => {
        if (!commentMember) {
            return null;
        }
        return {
            uuid: commentMember.uuid,
            name: commentMember.name,
            expertise: commentMember.expertise,
            avatar_image: commentMember.avatar_image,
            can_comment: commentMember.can_comment,
            paid: commentMember.paid
        };
    }, [commentMember]);

    const publicApi = useMemo(() => {
        return createPublicApi(api);
    }, [api]);

    const memberApi = useMemo(() => {
        return createMemberApi(api);
    }, [api]);

    const isAdmin = !!adminActions;

    const contextValue = useMemo(() => {
        return {
            publicApi,
            memberApi,
            isAdmin,
            adminActions,
            member,
            labs,
            supportEmail,
            commentMember,
            commentMemberLoaded
        };
    }, [publicApi, memberApi, isAdmin, adminActions, member, labs, supportEmail, commentMember, commentMemberLoaded]);

    return (
        <>
            {hasAdminSession && <AuthFrame adminUrl={adminUrl!} onError={onAdminAuthError} onLoad={onAdminAuthLoad} />}
            <CommentApiContext.Provider value={contextValue}>
                {children}
            </CommentApiContext.Provider>
        </>
    );
}
