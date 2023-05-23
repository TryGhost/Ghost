export const setupGhostApi = ({siteUrl}: {siteUrl: string}) => {
    const apiPath = 'members/api';

    function endpointFor({type, resource}: {type: 'members', resource: string}) {
        if (type === 'members') {
            return `${siteUrl.replace(/\/$/, '')}/${apiPath}/${resource}/`;
        }

        throw new Error(`Unknown type ${type}`);
    }

    return {
        sendMagicLink: async ({email, emailType}: {email: string, emailType: 'signup'}) => {
            const url = endpointFor({type: 'members', resource: 'send-magic-link'});

            const payload = JSON.stringify({
                //name,
                email,
                emailType
                /*newsletters,
                oldEmail,
                emailType,
                labels,
                requestSrc: 'portal',
                redirect*/
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
                return false;
            }

            return true;
        }
    };

    /*export async function sendMagicLink({email}) {
        const {apiRoot} = getGhostPaths();

        const payload = JSON.stringify({
            settings: newSettings
        });

        const response = await fetch(`${apiRoot}/settings/`, {
            headers: {
                'app-pragma': 'no-cache',
                'x-ghost-version': '5.47',
                'Content-Type': 'application/json'
            },
            body: payload,
            method: 'PUT',
            mode: 'cors',
            credentials: 'include'
        });

        const data: ISettingsResponse = await response.json();
        return data;
    }*/
};

export type GhostApi = ReturnType<typeof setupGhostApi>;
