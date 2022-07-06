import {transformApiSiteData} from './helpers';

function setupGhostApi({siteUrl = window.location.origin, apiUrl, apiKey}) {
    const apiPath = 'members/api';

    function endpointFor({type, resource, params = ''}) {
        if (type === 'members') {
            return `${siteUrl.replace(/\/$/, '')}/${apiPath}/${resource}/${params}`;
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

    // To fix pagination when we create new comments (or people post comments after you loaded the page, we need to only load comments creatd AFTER the page load)
    let firstCommentsLoadedAt = null;

    api.comments = {
        browse({page, postId}) {
            firstCommentsLoadedAt = firstCommentsLoadedAt ?? new Date().toISOString();

            const filter = encodeURIComponent(`post_id:${postId}+created_at:<=${firstCommentsLoadedAt}`);
            const order = encodeURIComponent('created_at DESC');

            const url = endpointFor({type: 'members', resource: 'comments', params: `?limit=5&include=member&order=${order}&filter=${filter}&page=${page}`});
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
            });
        },
        add({comment}) {
            const body = {
                comments: [comment]
            };
            const url = endpointFor({type: 'members', resource: 'comments'});
            return makeRequest({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }).then(function (res) {
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Failed to add comment');
                }
            });
        },
        edit({comment}) {
            const body = {
                comments: [comment]
            };
            const url = endpointFor({type: 'members', resource: `comments/${comment.id}`});
            return makeRequest({
                url,
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }).then(function (res) {
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Failed to edit comment');
                }
            });
        },
        like({comment}) {
            const body = {
                comments: [comment]
            };
            const url = endpointFor({type: 'members', resource: `comments/${comment.id}/like`});
            return makeRequest({
                url,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }).then(function (res) {
                if (res.ok) {
                    return 'Success';
                } else {
                    throw new Error('Failed to like comment');
                }
            });
        },
        unlike({comment}) {
            const body = {
                comments: [comment]
            };
            const url = endpointFor({type: 'members', resource: `comments/${comment.id}/like`});
            return makeRequest({
                url,
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }).then(function (res) {
                if (res.ok) {
                    return 'Success';
                } else {
                    throw new Error('Failed to unlike comment');
                }
            });
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
