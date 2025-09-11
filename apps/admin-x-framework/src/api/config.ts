import {createQuery} from '../utils/api/hooks';

export type JSONValue = string|number|boolean|null|Date|JSONObject|JSONArray;
export interface JSONObject { [key: string]: JSONValue }
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
    tenor?: {
        googleApiKey?: string | null;
        contentFilter?: string;
    };
    hostSettings?: {
        siteId?: string;
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
            }
        }
        billing?: {
            enabled?: boolean
            url?: string
        },
        pintura?: {
            js?: string
            css?: string
        },
        managedEmail?: {
            enabled?: boolean
            sendingDomain?: string
        },
    }
    security?: {
        staffDeviceVerification?: boolean;
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
