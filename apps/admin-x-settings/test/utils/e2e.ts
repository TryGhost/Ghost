import {ConfigResponseType, CustomThemeSettingsResponseType, ImagesResponseType, InvitesResponseType, LabelsResponseType, OffersResponseType, PostsResponseType, RolesResponseType, SettingsResponseType, SiteResponseType, ThemesResponseType, TiersResponseType, UsersResponseType} from '../../src/utils/api';
import {Page, Request} from '@playwright/test';
import {readFileSync} from 'fs';

export const responseFixtures = {
    settings: JSON.parse(readFileSync(`${__dirname}/responses/settings.json`).toString()) as SettingsResponseType,
    config: JSON.parse(readFileSync(`${__dirname}/responses/config.json`).toString()) as ConfigResponseType,
    users: JSON.parse(readFileSync(`${__dirname}/responses/users.json`).toString()) as UsersResponseType,
    me: JSON.parse(readFileSync(`${__dirname}/responses/me.json`).toString()) as UsersResponseType,
    roles: JSON.parse(readFileSync(`${__dirname}/responses/roles.json`).toString()) as RolesResponseType,
    site: JSON.parse(readFileSync(`${__dirname}/responses/site.json`).toString()) as SiteResponseType,
    invites: JSON.parse(readFileSync(`${__dirname}/responses/invites.json`).toString()) as InvitesResponseType,
    customThemeSettings: JSON.parse(readFileSync(`${__dirname}/responses/custom_theme_settings.json`).toString()) as CustomThemeSettingsResponseType,
    tiers: JSON.parse(readFileSync(`${__dirname}/responses/tiers.json`).toString()) as TiersResponseType,
    labels: JSON.parse(readFileSync(`${__dirname}/responses/labels.json`).toString()) as LabelsResponseType,
    offers: JSON.parse(readFileSync(`${__dirname}/responses/offers.json`).toString()) as OffersResponseType,
    themes: JSON.parse(readFileSync(`${__dirname}/responses/themes.json`).toString()) as ThemesResponseType
};

interface Responses {
    settings?: {
        browse?: SettingsResponseType
        edit?: SettingsResponseType
    }
    config?: {
        browse?: ConfigResponseType
    }
    users?: {
        browse?: UsersResponseType
        currentUser?: UsersResponseType
        edit?: UsersResponseType
        delete?: UsersResponseType
        updatePassword?: UsersResponseType
        makeOwner?: UsersResponseType
    }
    roles?: {
        browse?: RolesResponseType
    }
    invites?: {
        browse?: InvitesResponseType
        add?: InvitesResponseType
        delete?: InvitesResponseType
    }
    site?: {
        browse?: SiteResponseType
    }
    images?: {
        upload?: ImagesResponseType
    }
    customThemeSettings?: {
        browse?: CustomThemeSettingsResponseType
        edit?: CustomThemeSettingsResponseType
    }
    latestPost?: {
        browse?: PostsResponseType
    }
    tiers?: {
        browse?: TiersResponseType
        edit?: TiersResponseType
        add?: TiersResponseType
    }
    labels?: {
        browse?: LabelsResponseType
    }
    offers?: {
        browse?: OffersResponseType
    }
    themes?: {
        browse?: ThemesResponseType
        activate?: ThemesResponseType
        delete?: ThemesResponseType
        install?: ThemesResponseType
        upload?: ThemesResponseType
    }
    previewHtml?: {
        homepage?: string
        post?: string
    }
}

interface RequestRecord {
    url?: string
    body?: any
    headers?: {[key: string]: string}
}

type LastRequests = {
    settings: {
        browse: RequestRecord
        edit: RequestRecord
    }
    config: {
        browse: RequestRecord
    }
    users: {
        browse: RequestRecord
        currentUser: RequestRecord
        edit: RequestRecord
        delete: RequestRecord
        updatePassword: RequestRecord
        makeOwner: RequestRecord
    }
    roles: {
        browse: RequestRecord
    }
    invites: {
        browse: RequestRecord
        add: RequestRecord
        delete: RequestRecord
    }
    site: {
        browse: RequestRecord
    }
    images: {
        upload: RequestRecord
    }
    customThemeSettings: {
        browse: RequestRecord
        edit: RequestRecord
    }
    latestPost: {
        browse: RequestRecord
    }
    tiers: {
        browse: RequestRecord
        edit: RequestRecord
        add: RequestRecord
    }
    labels: {
        browse: RequestRecord
    }
    offers: {
        browse: RequestRecord
    }
    themes: {
        browse: RequestRecord
        activate: RequestRecord
        delete: RequestRecord
        install: RequestRecord
        upload: RequestRecord
    }
    previewHtml: {
        homepage: RequestRecord
        post: RequestRecord
    }
};

export async function mockApi({page,responses}: {page: Page, responses?: Responses}) {
    const lastApiRequests: LastRequests = {
        settings: {browse: {}, edit: {}},
        config: {browse: {}},
        users: {browse: {}, currentUser: {}, edit: {}, delete: {}, updatePassword: {}, makeOwner: {}},
        roles: {browse: {}},
        invites: {browse: {}, add: {}, delete: {}},
        site: {browse: {}},
        images: {upload: {}},
        customThemeSettings: {browse: {}, edit: {}},
        latestPost: {browse: {}},
        tiers: {browse: {}, edit: {}, add: {}},
        labels: {browse: {}},
        offers: {browse: {}},
        themes: {browse: {}, activate: {}, delete: {}, install: {}, upload: {}},
        previewHtml: {homepage: {}, post: {}}
    };

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/settings\//,
        respondTo: {
            GET: {
                body: responses?.settings?.browse ?? responseFixtures.settings,
                updateLastRequest: lastApiRequests.settings.browse
            },
            PUT: {
                body: responses?.settings?.edit ?? responseFixtures.settings,
                updateLastRequest: lastApiRequests.settings.edit
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/config\//,
        respondTo: {
            GET: {
                body: responses?.config?.browse ?? responseFixtures.config,
                updateLastRequest: lastApiRequests.config.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/users\/\?/,
        respondTo: {
            GET: {
                body: responses?.users?.browse ?? responseFixtures.users,
                updateLastRequest: lastApiRequests.users.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/users\/me\//,
        respondTo: {
            GET: {
                body: responses?.users?.currentUser ?? responseFixtures.me,
                updateLastRequest: lastApiRequests.users.currentUser
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/users\/(\d+|\w{24})\//,
        respondTo: {
            PUT: {
                body: responses?.users?.edit ?? responseFixtures.users,
                updateLastRequest: lastApiRequests.users.edit
            },
            DELETE: {
                body: responses?.users?.delete ?? responseFixtures.users,
                updateLastRequest: lastApiRequests.users.delete
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/users\/owner\//,
        respondTo: {
            PUT: {
                body: responses?.users?.makeOwner ?? responseFixtures.users,
                updateLastRequest: lastApiRequests.users.makeOwner
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/users\/password\//,
        respondTo: {
            PUT: {
                body: responses?.users?.updatePassword ?? responseFixtures.users,
                updateLastRequest: lastApiRequests.users.updatePassword
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/roles\/\?/,
        respondTo: {
            GET: {
                body: responses?.roles?.browse ?? responseFixtures.roles,
                updateLastRequest: lastApiRequests.roles.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/site\//,
        respondTo: {
            GET: {
                body: responses?.site?.browse ?? responseFixtures.site,
                updateLastRequest: lastApiRequests.site.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/images\/upload\/$/,
        respondTo: {
            POST: {
                body: responses?.images?.upload ?? {images: [{url: 'http://example.com/image.png', ref: null}]},
                updateLastRequest: lastApiRequests.images.upload
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/invites\//,
        respondTo: {
            GET: {
                body: responses?.invites?.browse ?? responseFixtures.invites,
                updateLastRequest: lastApiRequests.invites.browse
            },
            POST: {
                body: responses?.invites?.add ?? responseFixtures.invites,
                updateLastRequest: lastApiRequests.invites.add
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/invites\/\w{24}\//,
        respondTo: {
            DELETE: {
                body: responses?.invites?.delete ?? responseFixtures.invites,
                updateLastRequest: lastApiRequests.invites.delete
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/themes\/$/,
        respondTo: {
            GET: {
                body: responses?.themes?.browse ?? responseFixtures.themes,
                updateLastRequest: lastApiRequests.themes.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/themes\/(casper|edition|headline)\/$/,
        respondTo: {
            DELETE: {
                body: responses?.themes?.delete ?? responseFixtures.themes,
                updateLastRequest: lastApiRequests.themes.delete
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/themes\/\w+\/activate\/$/,
        respondTo: {
            PUT: {
                body: responses?.themes?.activate ?? responseFixtures.themes,
                updateLastRequest: lastApiRequests.themes.activate
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/themes\/install\//,
        respondTo: {
            POST: {
                body: responses?.themes?.install ?? responseFixtures.themes,
                updateLastRequest: lastApiRequests.themes.install
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/themes\/upload\/$/,
        respondTo: {
            POST: {
                body: responses?.themes?.upload ?? responseFixtures.themes,
                updateLastRequest: lastApiRequests.themes.upload
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/custom_theme_settings\/$/,
        respondTo: {
            GET: {
                body: responses?.customThemeSettings?.browse ?? responseFixtures.customThemeSettings,
                updateLastRequest: lastApiRequests.customThemeSettings.browse
            },
            PUT: {
                body: responses?.customThemeSettings?.edit ?? responseFixtures.customThemeSettings,
                updateLastRequest: lastApiRequests.customThemeSettings.edit
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/posts\/\?filter=/,
        respondTo: {
            GET: {
                body: responses?.latestPost?.browse ?? {posts: [{id: '1', url: `${responseFixtures.site.site.url}/test-post/`}]},
                updateLastRequest: lastApiRequests.latestPost.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/tiers\/\w{24}/,
        respondTo: {
            PUT: {
                body: responses?.tiers?.edit ?? responseFixtures.tiers,
                updateLastRequest: lastApiRequests.tiers.edit
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/tiers\/$/,
        respondTo: {
            POST: {
                body: responses?.tiers?.add ?? responseFixtures.tiers,
                updateLastRequest: lastApiRequests.tiers.add
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/tiers\/\?limit/,
        respondTo: {
            GET: {
                body: responses?.tiers?.browse ?? responseFixtures.tiers,
                updateLastRequest: lastApiRequests.tiers.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/labels\/\?limit=all$/,
        respondTo: {
            GET: {
                body: responses?.labels?.browse ?? responseFixtures.labels,
                updateLastRequest: lastApiRequests.labels.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: /\/ghost\/api\/admin\/offers\/\?limit=all$/,
        respondTo: {
            GET: {
                body: responses?.offers?.browse ?? responseFixtures.offers,
                updateLastRequest: lastApiRequests.offers.browse
            }
        }
    });

    await mockApiResponse({
        page,
        path: responseFixtures.site.site.url,
        respondTo: {
            POST: {
                condition: request => !!request.headers()['x-ghost-preview'],
                body: responses?.previewHtml?.homepage ?? '<html><head><style></style></head><body><div>homepage</div></body></html>',
                updateLastRequest: lastApiRequests.previewHtml.homepage
            }
        }
    });

    await mockApiResponse({
        page,
        path: `${responseFixtures.site.site.url}/test-post/`,
        respondTo: {
            POST: {
                condition: request => !!request.headers()['x-ghost-preview'],
                body: responses?.previewHtml?.post ?? '<html><head><style></style></head><body><div>post</div></body></html>',
                updateLastRequest: lastApiRequests.previewHtml.post
            }
        }
    });

    return lastApiRequests;
}

interface ResponseOptions {
    condition?: (request: Request) => boolean
    body: any
    status?: number
    updateLastRequest: RequestRecord
}

async function mockApiResponse({page, path, respondTo}: { page: Page; path: string | RegExp; respondTo: { [method: string]: ResponseOptions } }) {
    await page.route(path, async (route) => {
        const response = respondTo[route.request().method()];

        if (!response || (response.condition && !response.condition(route.request()))) {
            return route.continue();
        }

        const requestBody = JSON.parse(route.request().postData() || 'null');
        response.updateLastRequest.body = requestBody;
        response.updateLastRequest.url = route.request().url();
        response.updateLastRequest.headers = route.request().headers();

        await route.fulfill({
            status: response.status || 200,
            body: JSON.stringify(response.body)
        });
    });
}

export function updatedSettingsResponse(newSettings: Array<{ key: string, value: string | boolean | null }>) {
    return {
        ...responseFixtures.settings,
        settings: responseFixtures.settings.settings.map((setting) => {
            const newSetting = newSettings.find(({key}) => key === setting.key);

            return {key: setting.key, value: newSetting?.value || setting.value};
        })
    };
}
