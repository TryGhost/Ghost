export function setupAdminAPI({adminUrl}: {adminUrl: string}) {
    const frame = document.querySelector('iframe[data-frame="admin-auth"]') as HTMLIFrameElement;
    let uid = 1;
    const handlers: Record<string, (error: Error|undefined, result: any) => void> = {};
    const adminOrigin = new URL(adminUrl).origin;

    window.addEventListener('message', function (event) {
        if (event.origin !== adminOrigin) {
            // Other message that is not intended for us
            return;
        }

        let data = null;
        try {
            data = JSON.parse(event.data);
        } catch {
            return;
        }

        const handler = handlers[data.uid];

        if (!handler) {
            return;
        }

        delete handlers[data.uid];

        handler(data.error, data.result);
    });

    function callApi(action: string, args?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            function handler(error: Error|undefined, result: any) {
                if (error) {
                    return reject(error);
                }
                return resolve(result);
            }
            uid += 1;
            handlers[uid] = handler;
            frame.contentWindow!.postMessage(JSON.stringify({
                uid,
                action,
                ...args
            }), adminOrigin);
        });
    }

    const api = {
        async getUser() {
            const result = await callApi('getUser');
            if (!result || !result.users) {
                return null;
            }
            return result.users[0];
        },
        async hideComment(id: string) {
            return await callApi('hideComment', {id});
        },
        async showComment({id} : {id: string}) {
            return await callApi('showComment', {id});
        },

        async browse({postId, order, after, anchor, memberUuid}: {postId: string, order?: string, after?: string, anchor?: string, memberUuid?: string}) {
            const params = new URLSearchParams();

            params.set('limit', '20');
            if (after) {
                params.set('after', after);
            }
            if (anchor) {
                params.set('anchor', anchor);
            }
            if (order) {
                params.set('order', order);
            }

            if (memberUuid) {
                params.set('impersonate_member_uuid', memberUuid);
            }

            return await callApi('browseComments', {postId, params: params.toString()});
        },
        async replies({commentId, after, limit, memberUuid}: {commentId: string; after?: string; limit?: number, memberUuid?: string}) {
            const params = new URLSearchParams();

            if (limit) {
                params.set('limit', limit.toString());
            }

            if (after) {
                params.set('after', after);
            }

            if (memberUuid) {
                params.set('impersonate_member_uuid', memberUuid);
            }

            return await callApi('getReplies', {commentId, params: params.toString()});
        },

        async read({commentId, memberUuid}: {commentId: string, memberUuid?: string}) {
            const params = new URLSearchParams();

            if (memberUuid) {
                params.set('impersonate_member_uuid', memberUuid);
            }

            return await callApi('readComment', {
                commentId,
                ...(params.toString() && {params: params.toString()})
            });
        }
    };

    return api;
}
export type AdminApi = ReturnType<typeof setupAdminAPI>;
