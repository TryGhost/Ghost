import {transformApiSiteData} from './helpers';

function setupGhostApi({siteUrl = window.location.origin, apiUrl, apiKey}) {
    const apiPath = 'members/api';
    const commentsApiPath = 'comments/api';

    function endpointFor({type, resource, params = ''}) {
        if (type === 'members') {
            return `${siteUrl.replace(/\/$/, '')}/${apiPath}/${resource}/`;
        }
        if (type === 'comments') {
            return `${siteUrl.replace(/\/$/, '')}/${commentsApiPath}/${resource}/${params}`;
        }
    }

    function contentEndpointFor({resource, params = ''}) {
        if (apiUrl && apiKey) {
            return `${apiUrl.replace(/\/$/, '')}/${resource}/?key=${apiKey}&limit=all${params}`;
        }
        return '';
    }

    function makeRequest({url, method = 'GET', headers = {}, credentials = undefined, body = undefined}) {
        const options = {
            method,
            headers,
            credentials,
            body
        };
        return fetch(url, options);
    }
    const api = {};

    api.site = {
        settings() {
            const url = contentEndpointFor({resource: 'settings'});
            return makeRequest({
                url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then(function (res) {
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Failed to fetch site data');
                }
            });
        }
    };

    api.member = {
        identity() {
            const url = endpointFor({type: 'members', resource: 'session'});
            return makeRequest({
                url,
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok || res.status === 204) {
                    return null;
                }
                return res.text();
            });
        },

        sessionData() {
            const url = endpointFor({type: 'members', resource: 'member'});
            return makeRequest({
                url,
                credentials: 'same-origin'
            }).then(function (res) {
                if (!res.ok || res.status === 204) {
                    return null;
                }
                return res.json();
            });
        }
      
    };

    api.comments = {
        browse({page}) {
            const limit = 15;
            const comments = (new Array(limit)).fill().map(() => {
                return {
                    id: 'comment-' + Math.random() * 10000 + Date.now(),
                    member: {
                        avatar: '',
                        bio: 'CEO',
                        name: 'Just a name'
                    },
                    html: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Ut mollis erat vitae diam gravida accumsan vitae quis nisl. Donec luctus laoreet mauris, nec posuere turpis accumsan in. Proin sagittis magna quis vulputate tempus. Duis sagittis purus mattis enim condimentum, quis tempus est tristique.'
                };
            });

            // Temporary placeholder until we have a proper API
            return {
                comments,
                meta: {
                    pagination: {
                        page: page,
                        limit,
                        pages: 3,
                        total: 15 * 3,
                        next: null,
                        prev: null
                    }
                }
            };
            /*
            const url = endpointFor({type: 'comments', resource: 'comment', params: '?limit=15&page='+page});
            return makeRequest({
                url,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'same-origin'
            }).then(function (res) {
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Failed to fetch comments');
                }
            });*/
        }
    };

    api.init = async () => {
        let [member] = await Promise.all([
            api.member.sessionData()
        ]);
        let site = {};
        let settings = {};

        try {
            settings = await api.site.settings();
            site = {
                ...settings
            };
        } catch (e) {
            // Ignore
        }
        site = transformApiSiteData({site});
        return {site, member};
    };

    return api;
}

export default setupGhostApi;
