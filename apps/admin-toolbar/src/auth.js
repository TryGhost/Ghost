import {AUTH_TIMEOUT} from './constants';

export function createAuthFrame(adminUrl) {
    const frame = document.createElement('iframe');
    frame.dataset.frame = 'admin-auth';
    frame.src = `${adminUrl}auth-frame/`;
    frame.title = 'Ghost admin authentication';
    frame.tabIndex = -1;
    frame.style.cssText = 'display:none;width:0;height:0;border:0;';
    document.body.appendChild(frame);
    return frame;
}

export function createAdminApi(adminUrl, frame) {
    let uid = 0;
    const handlers = {};
    const adminOrigin = new URL(adminUrl).origin;

    window.addEventListener('message', function (event) {
        if (event.origin !== adminOrigin) {
            return;
        }

        let data;
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

    function call(action, args) {
        return new Promise((resolve, reject) => {
            uid += 1;
            const currentUid = uid;
            const timeout = window.setTimeout(() => {
                delete handlers[currentUid];
                reject(new Error('Admin authentication timed out'));
            }, AUTH_TIMEOUT);

            handlers[currentUid] = (error, result) => {
                window.clearTimeout(timeout);
                if (error) {
                    reject(new Error(error));
                } else {
                    resolve(result);
                }
            };

            frame.contentWindow?.postMessage(JSON.stringify({
                uid: currentUid,
                action,
                ...args
            }), adminOrigin);
        });
    }

    return {
        getUser: async () => {
            const result = await call('getUser');
            return result?.users?.[0] || null;
        }
    };
}

export function canShowToolbar(user) {
    const allowedRoles = new Set(['owner', 'administrator', 'editor']);
    return (user?.roles || []).some(role => allowedRoles.has((role?.name || '').toLowerCase()));
}
