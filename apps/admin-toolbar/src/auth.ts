import { AUTH_TIMEOUT } from './constants';
import type { StaffUser } from './user';

interface UsersResponse {
  users?: StaffUser[];
}

interface AuthFrameReply {
  uid: number;
  error: string | null;
  result: UsersResponse | null;
}

type ReplyHandler = (error: AuthFrameReply['error'], result: AuthFrameReply['result']) => void;

function isAuthFrameReply(data: unknown): data is AuthFrameReply {
  return (
    typeof data === 'object' &&
    data !== null &&
    'uid' in data &&
    typeof data.uid === 'number' &&
    'error' in data &&
    (data.error === null || typeof data.error === 'string') &&
    'result' in data &&
    typeof data.result === 'object'
  );
}

export function createAuthFrame(adminUrl: string) {
  const frame = document.createElement('iframe');
  frame.dataset.frame = 'admin-auth';
  frame.src = `${adminUrl}auth-frame/`;
  frame.title = 'Ghost admin authentication';
  frame.tabIndex = -1;
  frame.style.cssText = 'display:none;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  return frame;
}

export function createAdminApi(adminUrl: string, frame: HTMLIFrameElement) {
  let uid = 0;
  const handlers: Record<number, ReplyHandler> = {};
  const adminOrigin = new URL(adminUrl).origin;

  window.addEventListener('message', function (event) {
    if (event.origin !== adminOrigin || !event.source || event.source !== frame.contentWindow) {
      return;
    }

    let data: unknown;
    try {
      data = JSON.parse(event.data);
    } catch {
      return;
    }

    if (!isAuthFrameReply(data)) {
      return;
    }

    const handler = handlers[data.uid];
    if (!handler) {
      return;
    }

    delete handlers[data.uid];
    handler(data.error, data.result);
  });

  function call(action: string, args?: Record<string, unknown>) {
    return new Promise<AuthFrameReply['result']>((resolve, reject) => {
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

      frame.contentWindow?.postMessage(
        JSON.stringify({
          uid: currentUid,
          action,
          ...args,
        }),
        adminOrigin,
      );
    });
  }

  return {
    getUser: async () => {
      const result = await call('getUser');
      return result?.users?.[0] || null;
    },
  };
}

export function canShowToolbar(user: StaffUser) {
  const allowedRoles = new Set(['owner', 'administrator', 'editor']);
  return (user?.roles || []).some((role) => allowedRoles.has((role?.name || '').toLowerCase()));
}
