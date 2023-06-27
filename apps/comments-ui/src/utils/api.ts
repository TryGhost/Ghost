import {AddComment, Comment} from '../AppContext';

function setupGhostApi({siteUrl = window.location.origin, apiUrl, apiKey}: {siteUrl: string, apiUrl: string, apiKey: string}) {
    const apiPath = 'members/api';

    function endpointFor({type, resource, params = ''}: {type: string, resource: string, params?: string}) {
        if (type === 'members') {
            return `${siteUrl.replace(/\/$/, '')}/${apiPath}/${resource}/${params}`;
        }
        return '';
    }

    function contentEndpointFor({resource, params = ''}: {resource: string, params?: string}) {
        if (apiUrl && apiKey) {
            return `${apiUrl.replace(/\/$/, '')}/${resource}/?key=${apiKey}&limit=all${params}`;
        }
        return '';
    }

    function makeRequest({url, method = 'GET', headers = {}, credentials = undefined, body = undefined}: {url: string, method?: string, headers?: any, credentials?: any, body?: any}) {
        const options = {
            method,
            headers,
            credentials,
            body
        };
        return fetch(url, options);
    }

    // To fix pagination when we create new comments (or people post comments after you loaded the page, we need to only load comments creatd AFTER the page load)
    let firstCommentsLoadedAt: null | string = null;

    const api = {
        site: {
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
        },
        member: {
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
            },

            update({name, expertise}: {name?: string, expertise?: string}) {
                const url = endpointFor({type: 'members', resource: 'member'});
                const body = {
                    name,
                    expertise
                };

                return makeRequest({
                    url,
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify(body)
                }).then(function (res) {
                    if (!res.ok) {
                        return null;
                    }
                    return res.json();
                });
            }

        },
        comments: {
            async count({postId}: {postId: string | null}) {
                const params = postId ? `?ids=${postId}` : '';
                const url = endpointFor({type: 'members', resource: `comments/counts`, params});
                const response = await makeRequest({
                    url,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin'
                });

                const json = await response.json();

                if (postId) {
                    return json[postId];
                }

                return json;
            },
            browse({page, postId}: {page: number, postId: string}) {
                firstCommentsLoadedAt = firstCommentsLoadedAt ?? new Date().toISOString();

                const filter = encodeURIComponent(`post_id:${postId}+created_at:<=${firstCommentsLoadedAt}`);
                const order = encodeURIComponent('created_at DESC, id DESC');

                const url = endpointFor({type: 'members', resource: 'comments', params: `?limit=5&order=${order}&filter=${filter}&page=${page}`});
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
            async replies({commentId, afterReplyId, limit}: {commentId: string; afterReplyId: string; limit?: number | 'all'}) {
                const filter = encodeURIComponent(`id:>${afterReplyId}`);
                const order = encodeURIComponent('created_at ASC, id ASC');

                const url = endpointFor({type: 'members', resource: `comments/${commentId}/replies`, params: `?limit=${limit ?? 5}&order=${order}&filter=${filter}`});
                const res = await makeRequest({
                    url,
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    credentials: 'same-origin'
                });
                if (res.ok) {
                    return res.json();
                } else {
                    throw new Error('Failed to fetch replies');
                }
            },
            add({comment}: {comment: AddComment}) {
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
            edit({comment}: {comment: Partial<Comment> & {id: string}}) {
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
            read(commentId: string) {
                const url = endpointFor({type: 'members', resource: `comments/${commentId}`});
                return makeRequest({
                    url,
                    method: 'GET',
                    credentials: 'same-origin'
                }).then(function (res) {
                    if (res.ok) {
                        return res.json();
                    } else {
                        throw new Error('Failed to read comment');
                    }
                });
            },
            like({comment}: {comment: {id: string}}) {
                const url = endpointFor({type: 'members', resource: `comments/${comment.id}/like`});
                return makeRequest({
                    url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(function (res) {
                    if (res.ok) {
                        return 'Success';
                    } else {
                        throw new Error('Failed to like comment');
                    }
                });
            },
            unlike({comment}: {comment: {id: string}}) {
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
            },
            report({comment}: {comment: {id: string}}) {
                const url = endpointFor({type: 'members', resource: `comments/${comment.id}/report`});
                return makeRequest({
                    url,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                }).then(function (res) {
                    if (res.ok) {
                        return 'Success';
                    } else {
                        throw new Error('Failed to report comment');
                    }
                });
            }
        },
        init: (() => {}) as () => Promise<{ member: any; }>
    };

    api.init = async () => {
        let [member] = await Promise.all([
            api.member.sessionData()
        ]);

        return {member};
    };

    return api;
}

export default setupGhostApi;
export type GhostApi = ReturnType<typeof setupGhostApi>;
