import {getUrlHistory} from './helpers';

export const setupGhostApi = ({siteUrl}: {siteUrl: string}) => {
    const apiPath = 'members/api';

    function endpointFor({type, resource}: {type: 'members', resource: string}) {
        if (type === 'members') {
            return `${siteUrl.replace(/\/$/, '')}/${apiPath}/${resource}/`;
        }

        throw new Error(`Unknown type ${type}`);
    }

    return {
        getIntegrityToken: async (): Promise<string> => {
            const url = endpointFor({type: 'members', resource: 'integrity-token'});

            const response = await fetch(url, {
                headers: {
                    'app-pragma': 'no-cache',
                    'x-ghost-version': '5.90'
                }
            });

            if (response.status < 200 || response.status >= 300) {
                throw new Error(response.statusText);
            }

            return response.text();
        },
        sendMagicLink: async ({email, integrityToken, labels}: {email: string, labels: string[], integrityToken: string}) => {
            const url = endpointFor({type: 'members', resource: 'send-magic-link'});

            const payload = JSON.stringify({
                email,
                emailType: 'signup',
                labels,
                urlHistory: getUrlHistory({siteUrl}),
                integrityToken
            });

            const response = await fetch(url, {
                headers: {
                    'app-pragma': 'no-cache',
                    'x-ghost-version': '5.47',
                    'Content-Type': 'application/json'
                },
                body: payload,
                method: 'POST'
            });

            if (response.status < 200 || response.status >= 300) {
                throw new Error(response.statusText);
            }
        }
    };
};

export type GhostApi = ReturnType<typeof setupGhostApi>;
