import {Config, CustomThemeSetting, InstalledTheme, Label, Offer, Post, Setting, SiteData, Theme, Tier, User, UserRole} from '../types/api';
import {getGhostPaths} from './helpers';

export interface Meta {
    pagination: {
        page: number;
        limit: number;
        pages: number;
        total: number;
        next: number;
        prev: number;
    }
}

export type SettingsResponseMeta = Meta & { sent_email_verification?: boolean }

export interface SettingsResponseType {
    meta?: SettingsResponseMeta;
    settings: Setting[];
}

export interface ConfigResponseType {
    config: Config;
}

export interface UsersResponseType {
    meta?: Meta;
    users: User[];
}

export interface DeleteUserResponse {
    meta: {
        filename: string;
    }
}

export interface RolesResponseType {
    meta?: Meta;
    roles: UserRole[];
}

export interface UserInvite {
    created_at: string;
    email: string;
    expires: number;
    id: string;
    role_id: string;
    role?: string;
    status: string;
    updated_at: string;
}

export interface InvitesResponseType {
    meta?: Meta;
    invites: UserInvite[];
}

export interface CustomThemeSettingsResponseType {
    custom_theme_settings: CustomThemeSetting[];
}

export interface PostsResponseType {
    meta?: Meta
    posts: Post[];
}

export interface TiersResponseType {
    meta?: Meta
    tiers: Tier[]
}

export interface LabelsResponseType {
    meta?: Meta
    labels: Label[]
}

export interface OffersResponseType {
    meta?: Meta
    offers: Offer[]
}

export interface SiteResponseType {
    site: SiteData;
}

export interface ImagesResponseType {
    images: {
        url: string;
        ref: string | null;
    }[];
}

export interface PasswordUpdateResponseType {
    password: [{
        message: string;
    }];
}

export interface ThemesResponseType {
    themes: Theme[];
}

export interface ThemesInstallResponseType {
    themes: InstalledTheme[];
}

interface RequestOptions {
    method?: string;
    body?: string | FormData;
    headers?: {
        'Content-Type'?: string;
    };
}

interface BrowseRoleOptions {
    queryParams: {
        [key: string]: string;
    }
}

interface UpdatePasswordOptions {
    newPassword: string;
    confirmNewPassword: string;
    userId: string;
    oldPassword?: string;
}

export interface API {
    settings: {
        browse: () => Promise<SettingsResponseType>;
        edit: (newSettings: Setting[]) => Promise<SettingsResponseType>;
    };
    config: {
        browse: () => Promise<ConfigResponseType>;
    };
    users: {
        browse: () => Promise<UsersResponseType>;
        currentUser: () => Promise<User>;
        edit: (editedUser: User) => Promise<UsersResponseType>;
        delete: (userId: string) => Promise<DeleteUserResponse>;
        updatePassword: (options: UpdatePasswordOptions) => Promise<PasswordUpdateResponseType>;
        makeOwner: (userId: string) => Promise<UsersResponseType>;
    };
    roles: {
        browse: (options?: BrowseRoleOptions) => Promise<RolesResponseType>;
    };
    site: {
        browse: () => Promise<SiteResponseType>;
    };
    images: {
        upload: ({file}: {file: File}) => Promise<ImagesResponseType>;
    };
    invites: {
        browse: () => Promise<InvitesResponseType>;
        add: ({email, roleId} : {
            email: string;
            roleId: string;
            expires?: number;
            status?: string;
            token?: string;
        }) => Promise<InvitesResponseType>;
        delete: (inviteId: string) => Promise<void>;
    };
    customThemeSettings: {
        browse: () => Promise<CustomThemeSettingsResponseType>
        edit: (newSettings: CustomThemeSetting[]) => Promise<CustomThemeSettingsResponseType>
    };
    latestPost: {
        browse: () => Promise<PostsResponseType>
    };
    tiers: {
        browse: () => Promise<TiersResponseType>
        edit: (newTier: Tier) => Promise<TiersResponseType>
        add: (newTier: Partial<Tier>) => Promise<TiersResponseType>
    };
    labels: {
        browse: () => Promise<LabelsResponseType>
    };
    offers: {
        browse: () => Promise<OffersResponseType>
    };
    themes: {
        browse: () => Promise<ThemesResponseType>;
        activate: (themeName: string) => Promise<ThemesResponseType>;
        delete: (themeName: string) => Promise<void>;
        install: (repo: string) => Promise<ThemesInstallResponseType>;
        upload: ({file}: {file: File}) => Promise<ThemesInstallResponseType>;
    };
}

interface GhostApiOptions {
    ghostVersion: string;
}

function setupGhostApi({ghostVersion}: GhostApiOptions): API {
    const {apiRoot} = getGhostPaths();

    function fetcher(url: string, options: RequestOptions = {}) {
        const endpoint = `${apiRoot}${url}`;
        // By default, we set the Content-Type header to application/json
        const defaultHeaders = {
            'app-pragma': 'no-cache',
            'x-ghost-version': ghostVersion
        };
        const headers = options?.headers || {
            'Content-Type': 'application/json'
        };
        return fetch(endpoint, {
            headers: {
                ...defaultHeaders,
                ...headers
            },
            method: 'GET',
            mode: 'cors',
            credentials: 'include',
            ...options
        });
    }

    const api: API = {
        settings: {
            browse: async () => {
                const queryString = `group=site,theme,private,members,portal,newsletter,email,amp,labs,slack,unsplash,views,firstpromoter,editor,comments,analytics,announcement,pintura`;

                const response = await fetcher(`/settings/?${queryString}`, {});

                const data: SettingsResponseType = await response.json();
                return data;
            },
            edit: async (newSettings: Setting[]) => {
                const payload = JSON.stringify({
                    settings: newSettings
                });

                const response = await fetcher(`/settings/`, {
                    method: 'PUT',
                    body: payload
                });

                const data: SettingsResponseType = await response.json();
                return data;
            }
        },
        config: {
            browse: async () => {
                const response = await fetcher(`/config/`, {});
                const data: ConfigResponseType = await response.json();
                return data;
            }
        },
        users: {
            browse: async () => {
                const response = await fetcher(`/users/?limit=all&include=roles`, {});
                const data: UsersResponseType = await response.json();
                return data;
            },
            currentUser: async (): Promise<User> => {
                const response = await fetcher(`/users/me/`, {});
                const data: UsersResponseType = await response.json();
                return data.users[0];
            },
            edit: async (editedUser: User) => {
                const payload = JSON.stringify({
                    users: [editedUser]
                });

                const response = await fetcher(`/users/${editedUser.id}/?include=roles`, {
                    method: 'PUT',
                    body: payload
                });

                const data: UsersResponseType = await response.json();
                return data;
            },
            updatePassword: async ({newPassword, confirmNewPassword, userId, oldPassword}) => {
                const payload = JSON.stringify({
                    password: [{
                        user_id: userId,
                        oldPassword: oldPassword || '',
                        newPassword: newPassword,
                        ne2Password: confirmNewPassword
                    }]
                });
                const response = await fetcher(`/users/password/`, {
                    method: 'PUT',
                    body: payload
                });
                const data: PasswordUpdateResponseType = await response.json();
                return data;
            },
            delete: async (userId: string) => {
                const response = await fetcher(`/users/${userId}/`, {
                    method: 'DELETE'
                });
                const data: DeleteUserResponse = await response.json();
                return data;
            },
            makeOwner: async (userId: string) => {
                const payload = JSON.stringify({
                    owner: [{
                        id: userId
                    }]
                });
                const response = await fetcher(`/users/owner/`, {
                    method: 'PUT',
                    body: payload
                });
                const data: UsersResponseType = await response.json();
                return data;
            }
        },
        roles: {
            browse: async (options?: BrowseRoleOptions) => {
                const queryParams = options?.queryParams || {};
                queryParams.limit = 'all';
                const queryString = Object.keys(options?.queryParams || {})
                    .map(key => `${key}=${options?.queryParams[key]}`)
                    .join('&');

                const response = await fetcher(`/roles/?${queryString}`, {});
                const data: RolesResponseType = await response.json();
                return data;
            }
        },
        site: {
            browse: async () => {
                const response = await fetcher(`/site/`, {});
                const data: any = await response.json();
                return data;
            }
        },
        images: {
            upload: async ({file}: {file: File}) => {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('purpose', 'image');

                const response = await fetcher(`/images/upload/`, {
                    method: 'POST',
                    body: formData,
                    headers: {}
                });
                const data: any = await response.json();
                return data;
            }
        },
        invites: {
            browse: async () => {
                const response = await fetcher(`/invites/`, {});
                const data: InvitesResponseType = await response.json();
                return data;
            },
            add: async ({email, roleId}) => {
                const payload = JSON.stringify({
                    invites: [{
                        email: email,
                        role_id: roleId,
                        expires: null,
                        status: null,
                        token: null
                    }]
                });
                const response = await fetcher(`/invites/`, {
                    method: 'POST',
                    body: payload
                });
                const data: InvitesResponseType = await response.json();
                return data;
            },
            delete: async (inviteId: string) => {
                await fetcher(`/invites/${inviteId}/`, {
                    method: 'DELETE'
                });
                return;
            }
        },
        customThemeSettings: {
            browse: async () => {
                const response = await fetcher('/custom_theme_settings/');

                const data: CustomThemeSettingsResponseType = await response.json();
                return data;
            },
            edit: async (newSettings) => {
                const response = await fetcher('/custom_theme_settings/', {
                    method: 'PUT',
                    body: JSON.stringify({custom_theme_settings: newSettings})
                });

                const data: CustomThemeSettingsResponseType = await response.json();
                return data;
            }
        },
        latestPost: {
            browse: async () => {
                const response = await fetcher('/posts/?filter=status%3Apublished&order=published_at%20DESC&limit=1&fields=id,url');
                const data: PostsResponseType = await response.json();
                return data;
            }
        },
        tiers: {
            browse: async () => {
                const response = await fetcher(`/tiers/?limit=all`);
                const data: TiersResponseType = await response.json();
                return data;
            },
            edit: async (tier) => {
                const response = await fetcher(`/tiers/${tier.id}`, {
                    method: 'PUT',
                    body: JSON.stringify({tiers: [tier]})
                });
                const data: TiersResponseType = await response.json();
                return data;
            },
            add: async (tier) => {
                const response = await fetcher(`/tiers/`, {
                    method: 'POST',
                    body: JSON.stringify({tiers: [tier]})
                });
                const data: TiersResponseType = await response.json();
                return data;
            }
        },
        labels: {
            browse: async () => {
                const response = await fetcher('/labels/?limit=all');
                const data: LabelsResponseType = await response.json();
                return data;
            }
        },
        offers: {
            browse: async () => {
                const response = await fetcher('/offers/?limit=all');
                const data: OffersResponseType = await response.json();
                return data;
            }
        },
        themes: {
            browse: async () => {
                const response = await fetcher('/themes/');
                const data: ThemesResponseType = await response.json();
                return data;
            },
            activate: async (themeName: string) => {
                const response = await fetcher(`/themes/${themeName}/activate/`, {
                    method: 'PUT'
                });
                const data: ThemesResponseType = await response.json();
                return data;
            },
            delete: async (themeName: string) => {
                await fetcher(`/themes/${themeName}/`, {
                    method: 'DELETE'
                });
                return;
            },
            install: async (repo) => {
                const response = await fetcher(`/themes/install/?source=github&ref=${encodeURIComponent(repo)}`, {
                    method: 'POST'
                });
                const data: ThemesResponseType = await response.json();
                return data;
            },
            upload: async ({file}: {file: File}) => {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetcher(`/themes/upload/`, {
                    method: 'POST',
                    body: formData,
                    headers: {}
                });
                const data: ThemesInstallResponseType = await response.json();
                return data;
            }
        }
    };

    return api;
}

export default setupGhostApi;
