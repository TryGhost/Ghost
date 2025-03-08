import {create} from 'zustand';

export interface UserStore {
    account: string | null;
    setAccount: (account: string) => void;
    getAccount: () => string | null;
}

export const useUserStore = create<UserStore>((set, get) => ({
    account: null,
    setAccount: account => set({account}),
    getAccount: () => get().account
}));
