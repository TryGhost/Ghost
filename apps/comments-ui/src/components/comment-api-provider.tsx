import AuthFrame from '../auth-frame';
import React, {createContext, useContext, useEffect, useMemo, useState} from 'react';
import {CommentsApi, GhostApi} from '../utils/api';
import {LabsContextType, Member} from '../app-context';
import {setupAdminAPI} from '../utils/admin-api';

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

export type PublicApi = CommentsApi;

export type MemberApi = CommentsApi & {
    updateMember(data: {name?: string; expertise?: string}): Promise<Member | null>;
};

export type AdminActions = {
    hideComment(id: string): Promise<any>;
    showComment(params: {id: string}): Promise<any>;
};

const ALLOWED_MODERATORS = ['Owner', 'Administrator', 'Super Editor'];

type CommentApiContextType = {
    publicApi: PublicApi;
    memberApi: MemberApi;
    isAdmin: boolean;
    adminActions: AdminActions | null;
    member: Member | null;
    labs: LabsContextType;
    supportEmail: string | null;
    memberLoaded: boolean;
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
    const [member, setMember] = useState<Member | null>(null);
    const [memberLoaded, setMemberLoaded] = useState(false);

    const publicApi: PublicApi = useMemo(() => api.comments({credentials: 'omit'}), [api]);
    const memberApi: MemberApi = useMemo(() => ({...api.comments({credentials: 'same-origin'}), updateMember: api.member.update}), [api]);

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
        memberApi.getMember({postId})
            .then((data) => {
                if (data) {
                    setMember(data.member);
                }
            })
            .catch(() => {})
            .finally(() => {
                setMemberLoaded(true);
            });
    }, [memberApi, postId]);

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
            memberLoaded
        };
    }, [publicApi, memberApi, isAdmin, adminActions, member, labs, supportEmail, memberLoaded]);

    return (
        <>
            {hasAdminSession && <AuthFrame adminUrl={adminUrl!} onError={onAdminAuthError} onLoad={onAdminAuthLoad} />}
            <CommentApiContext.Provider value={contextValue}>
                {children}
            </CommentApiContext.Provider>
        </>
    );
}
