// Ref: https://reactjs.org/docs/context.html
import React, {useContext} from 'react';
import {ActionType, Actions, SyncActionType, SyncActions} from './actions';
import {Page} from './pages';

export type PopupNotification = {
    type: string,
    status: string,
    autoHide: boolean,
    closeable: boolean,
    duration: number,
    meta: any,
    message: string,
    count: number
}

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
    replies: Comment[],
    status: string,
    liked: boolean,
    count: {
        replies: number,
        likes: number,
    },
    member: Member,
    edited_at: string,
    created_at: string,
    html: string
}

export type AddComment = {
    post_id: string,
    status: string,
    html: string
}

export type AppContextType = {
    action: string,
    popupNotification: PopupNotification | null,
    customSiteUrl: string | undefined,
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
    postId: string,
    title: string,
    showCount: boolean,
    colorScheme: string | undefined,
    avatarSaturation: number | undefined,
    accentColor: string | undefined,
    commentsEnabled: string | undefined,
    publication: string,
    secundaryFormCount: number,
    popup: Page | null,

    // This part makes sure we can add automatic data and return types to the actions when using context.dispatchAction('actionName', data)
    dispatchAction: <T extends ActionType | SyncActionType>(action: T, data: Parameters<(typeof Actions & typeof SyncActions)[T]>[0] extends {data: any} ? Parameters<(typeof Actions & typeof SyncActions)[T]>[0]['data'] : {}) => T extends ActionType ? Promise<void> : void
}

export const AppContext = React.createContext<AppContextType>({} as any);

export const AppContextProvider = AppContext.Provider;

export const useAppContext = () => useContext(AppContext);
