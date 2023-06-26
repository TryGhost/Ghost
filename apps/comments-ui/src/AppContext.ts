// Ref: https://reactjs.org/docs/context.html
import React, {useContext} from 'react';

export type Popup = {
    type: string,
}

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

export type AppContextType = {
    action: string,
    popupNotification: PopupNotification | null,
    customSiteUrl: string | undefined,
    member: null | any,
    admin: null | any,
    comments: null | any[],
    pagination: {} | null,
    commentCount: number,
    postId: string,
    title: string,
    showCount: boolean,
    colorScheme: string | undefined,
    avatarSaturation: string | undefined,
    accentColor: string | undefined,
    commentsEnabled: string | undefined,
    publication: string,
    secundaryFormCount: number,
    popup: null | Popup,

    // Warning: make sure we pass a variable here (binded in constructor), because if we create a new function here, it will also change when anything in the state changes
    // causing loops in useEffect hooks that depend on dispatchAction
    dispatchAction: (action: string, data: any) => Promise<void>,
}

export const AppContext = React.createContext<AppContextType>({} as any);

export const AppContextProvider = AppContext.Provider;

export const useAppContext = () => useContext(AppContext);
