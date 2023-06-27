import {CustomThemeSettingsResponseType, ImagesResponseType, InvitesResponseType, RolesResponseType, SettingsResponseType, SiteResponseType, ThemesResponseType, UsersResponseType} from '../../src/utils/api';
import {Page, Request} from '@playwright/test';
import {readFileSync} from 'fs';

export const responseFixtures = {
    settings: JSON.parse(readFileSync(`${__dirname}/responses/settings.json`).toString()) as SettingsResponseType,
    users: JSON.parse(readFileSync(`${__dirname}/responses/users.json`).toString()) as UsersResponseType,
    me: JSON.parse(readFileSync(`${__dirname}/responses/me.json`).toString()) as UsersResponseType,
    roles: JSON.parse(readFileSync(`${__dirname}/responses/roles.json`).toString()) as RolesResponseType,
    site: JSON.parse(readFileSync(`${__dirname}/responses/site.json`).toString()) as SiteResponseType,
    invites: JSON.parse(readFileSync(`${__dirname}/responses/invites.json`).toString()) as InvitesResponseType,
    custom_theme_settings: JSON.parse(readFileSync(`${__dirname}/responses/custom_theme_settings.json`).toString()) as CustomThemeSettingsResponseType,
    themes: JSON.parse(readFileSync(`${__dirname}/responses/themes.json`).toString()) as ThemesResponseType
};

interface Responses {
    settings?: {
        browse?: SettingsResponseType
        edit?: SettingsResponseType
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
    custom_theme_settings?: {
        browse?: CustomThemeSettingsResponseType
        edit?: CustomThemeSettingsResponseType
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
    custom_theme_settings: {
        browse: RequestRecord
        edit: RequestRecord
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
    }
};

export async function mockApi({page,responses}: {page: Page, responses?: Responses}) {
    const lastApiRequests: LastRequests = {
        settings: {browse: {}, edit: {}},
        users: {browse: {}, currentUser: {}, edit: {}, delete: {}, updatePassword: {}, makeOwner: {}},
        roles: {browse: {}},
        invites: {browse: {}, add: {}, delete: {}},
        site: {browse: {}},
        images: {upload: {}},
        custom_theme_settings: {browse: {}, edit: {}},
        themes: {browse: {}, activate: {}, delete: {}, install: {}, upload: {}},
        previewHtml: {homepage: {}}
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
                body: responses?.custom_theme_settings?.browse ?? responseFixtures.custom_theme_settings,
                updateLastRequest: lastApiRequests.custom_theme_settings.browse
            },
            PUT: {
                body: responses?.custom_theme_settings?.edit ?? responseFixtures.custom_theme_settings,
                updateLastRequest: lastApiRequests.custom_theme_settings.edit
            }
        }
    });

    await mockApiResponse({
        page,
        path: responseFixtures.site.site.url,
        respondTo: {
            POST: {
                condition: request => !!request.headers()['x-ghost-preview'],
                body: responses?.previewHtml?.homepage ?? '<html><head><style></style></head><body><div>test</div></body></html>',
                updateLastRequest: lastApiRequests.previewHtml.homepage
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
