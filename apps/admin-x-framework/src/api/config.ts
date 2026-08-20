import {createQuery} from '../utils/api/hooks';

export type JSONValue = string|number|boolean|null|Date|JSONObject|JSONArray;
export interface JSONObject { [key: string]: JSONValue }

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface JSONArray extends Array<string|number|boolean|Date|JSONObject|JSONValue> {}

export type Config = {
    version: string;
    environment: string;
    editor: {
        url: string
        version: string
    };
    signupForm: {
        url: string,
        version: string
    }
    enableDeveloperExperiments: boolean;
    database: string;
    blogUrl?: string;
    labs: Record<string, boolean>;
    stripeDirect: boolean;
    mail: string;
    stats?: JSONObject & {
        endpoint?: string;
        id?: string;
    };
    emailAnalytics?: boolean;
    klipy?: {
        apiKey?: string | null;
        contentFilter?: string;
    };
    pintura?: {
        js?: string;
        css?: string;
    };
    hostSettings?: {
        siteId?: string;
        forceUpgrade?: boolean;
        limits?: {
            // Partially typed, see https://github.com/TryGhost/SDK/tree/main/packages/limit-service
            customIntegrations?: {
                disabled: boolean;
            }
            staff?: {
                max?: number
                error?: string
            }
            members?: {
                max?: number
                error?: string
            }
            newsletters?: {
                max?: number
                error?: string
            },
            customThemes?: {
                allowlist?: string[],
                error?: string
            },
            limitStripeConnect?: {
                disabled: boolean,
                error?: string
            },
            limitAnalytics?: {
                disabled: boolean,
                error?: string
            },
            limitSocialWeb?: {
                disabled: boolean,
                error?: string
            },
            publicSiteAccess?: {
                disabled: boolean,
                // Copy shown in the pre-launch banner when public site access is disabled.
                // Managed hosting providers can override these; each falls back to Ghost's default.
                error?: string, // Banner message
                title?: string, // Banner heading
                upgradeUrl?: string // Destination for the banner's upgrade button
            }
        }
        billing?: {
            enabled?: boolean
            url?: string
            // Destination for the upgrade button shown when a host limit is reached.
            // Managed hosting providers can override it; falls back to Ghost's default.
            upgradeUrl?: string // eg. '#/pro/billing/plans' or an absolute billing URL
            // Copy and branding for the sidebar trial banner.
            // Managed hosting providers can override these; each falls back to Ghost's default.
            upgradeBanner?: {
                title?: string // Banner heading
                message?: string // Banner message, {{days}} is replaced with the remaining trial days
                upgradeUrl?: string // Destination for the banner's upgrade button
                logo?: string // Logo shown above the heading
                logoDark?: string // Logo shown in dark mode, falls back to logo
                logoAlt?: string // Alt text for the logo
            }
            // Search entries for billing paths, defined in host config (hostSettings.billing.search: {})
            search?: {
                groupName?: string
                items?: {
                    id?: string
                    title?: string
                    path?: string
                    keywords?: string
                }[]
            }
        },
        managedEmail?: {
            enabled?: boolean
            sendingDomain?: string
        },
        export?: {
            // Host archive webhook — when set, "Export data" delivers the
            // archive by email instead of a synchronous download
            generate_archive_url?: string
        }
    }
    security?: {
        staffDeviceVerification?: boolean;
    };
    featurebase?: {
        enabled?: boolean;
        organization?: string;
    };
    // Config is relatively fluid, so we only type used properties above and still support arbitrary property access when needed
    [key: string]: JSONValue | undefined;
};

export interface ConfigResponseType {
    config: Config;
}

const dataType = 'ConfigResponseType';

export const configDataType = dataType;

export const useBrowseConfig = createQuery<ConfigResponseType>({
    dataType,
    path: '/config/'
});

// Helpers

export const isManagedEmail = (config: Config) => {
    return !!config?.hostSettings?.managedEmail?.enabled;
};

export const hasSendingDomain = (config: Config) => {
    const sendingDomain = config?.hostSettings?.managedEmail?.sendingDomain;
    return typeof sendingDomain === 'string' && sendingDomain.length > 0;
};

export const sendingDomain = (config: Config) => {
    return config?.hostSettings?.managedEmail?.sendingDomain;
};

export const DEFAULT_UPGRADE_ROUTE = '/pro';

// hostSettings stores an href; navigation takes a route, so a hash one drops its '#'
export const upgradeRoute = (config?: Config) => {
    const configured = config?.hostSettings?.billing?.upgradeUrl;

    return configured ? configured.replace(/^#/, '') : DEFAULT_UPGRADE_ROUTE;
};
