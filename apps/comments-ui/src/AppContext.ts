// Ref: https://reactjs.org/docs/context.html
import React, {useContext} from 'react';
import {ActionType, Actions, SyncActionType, SyncActions} from './actions';
import {AdminApi} from './utils/adminApi';
import {Page} from './pages';

export type Member = {
    id: string,
    uuid: string,
    name: string,
    avatar: string,
    expertise: string
}

export type Comment = {
    id: string,
    post_id: string,
    in_reply_to_id: string,
    in_reply_to_snippet: string,
    replies: Comment[],
    status: string,
    liked: boolean,
    count: {
        replies: number,
        likes: number,
    },
    member: Member | null,
    edited_at: string,
    created_at: string,
    html: string
}

export type OpenCommentForm = {
    id: string,
    parent_id?: string,
    in_reply_to_id?: string,
    in_reply_to_snippet?: string,
    type: 'reply' | 'edit',
    hasUnsavedChanges: boolean
}

export type AddComment = {
    post_id: string,
    status: string,
    html: string
}

export type LabsContextType = {
    [key: string]: boolean | undefined
}

export type CommentsOptions = {
    locale: string,
    siteUrl: string,
    apiKey: string | undefined,
    apiUrl: string | undefined,
    postId: string,
    adminUrl: string | undefined,
    colorScheme: string | undefined,
    avatarSaturation: number | undefined,
    accentColor: string,
    commentsEnabled: string | undefined,
    title: string | null,
    showCount: boolean,
    publication: string
};

export type EditableAppContext = {
    initStatus: string,
    member: null | any,
    admin: null | any,
    comments: Comment[],
    pagination: {
        page: number,
        limit: number,
        pages: number,
        total: number
    } | null,
    commentCount: number,
    openCommentForms: OpenCommentForm[],
    popup: Page | null,
    labs: LabsContextType,
    order: string,
    adminApi: AdminApi | null
}

export type TranslationFunction = (key: string, replacements?: Record<string, string | number>) => string;

export type AppContextType = EditableAppContext & CommentsOptions & {
    // This part makes sure we can add automatic data and return types to the actions when using context.dispatchAction('actionName', data)
    // eslint-disable-next-line @typescript-eslint/ban-types
    t: TranslationFunction,
    dispatchAction: <T extends ActionType | SyncActionType>(action: T, data: Parameters<(typeof Actions & typeof SyncActions)[T]>[0] extends { data: any } ? Parameters<(typeof Actions & typeof SyncActions)[T]>[0]['data'] : any) => T extends ActionType ? Promise<void> : void,
    openFormCount: number
}

// Copy time from AppContextType
export type DispatchActionType = AppContextType['dispatchAction'];
export const AppContext = React.createContext<AppContextType>({} as any);

export const AppContextProvider = AppContext.Provider;

export const useAppContext = () => useContext(AppContext);

export const useOrderChange = () => {
    const context = useAppContext();
    const dispatchAction = context.dispatchAction;
    return (order: string) => {
        dispatchAction('setOrder', {order});
    };
};

export const useLabs = () => {
    try {
        const context = useAppContext();
        return context.labs || {};
    } catch (e) {
        return {};
    }
};
