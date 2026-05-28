import Service, {inject as service} from '@ember/service';
import fetch from 'fetch';
import {tracked} from '@glimmer/tracking';

const EVENT_TYPE_SNAPSHOT = 'snapshot';
const EVENT_TYPE_POST = 'post';

/**
 * Subscribes to a long-lived SSE stream that pushes presence (who is
 * editing what) changes to all admin tabs. Holds a tracked map of
 * postId → users[]; components read via usersForPost(postId) and
 * re-render automatically.
 */
export default class PresenceService extends Service {
    @service feature;
    @service ghostPaths;
    @service session;

    @tracked _byPostId = new Map();

    _source = null;
    _currentPostId = null;
    _beforeUnloadHandler = null;

    start() {
        if (this._source || typeof window === 'undefined' || !window.EventSource) {
            return;
        }
        if (!this.feature.get('editorPresence')) {
            return;
        }
        const streamUrl = this.ghostPaths.url.api('presence', 'stream');
        try {
            this._source = new EventSource(streamUrl, {withCredentials: true});
        } catch (e) {
            console.warn('[presence] EventSource construction failed', e); // eslint-disable-line no-console
            return;
        }
        this._source.onmessage = event => this._handleMessage(event);
        this._source.onerror = () => {
            // EventSource auto-reconnects on transient errors. Terminal
            // closures (401/403/404) leave readyState === CLOSED; log
            // those so silent presence failures are debuggable.
            if (this._source && this._source.readyState === EventSource.CLOSED) {
                console.warn('[presence] SSE stream closed; not reconnecting'); // eslint-disable-line no-console
            }
        };

        // Pagehide covers tab/window close, where the Ember route's
        // deactivate hook does not fire. TTL is the safety net if the
        // beacon does not arrive.
        this._beforeUnloadHandler = () => {
            const postId = this._currentPostId;
            if (!postId) {
                return;
            }
            this._sendLeave(postId);
        };
        window.addEventListener('pagehide', this._beforeUnloadHandler);
    }

    stop() {
        if (this._source) {
            this._source.close();
            this._source = null;
        }
        if (this._beforeUnloadHandler) {
            window.removeEventListener('pagehide', this._beforeUnloadHandler);
            this._beforeUnloadHandler = null;
        }
        this._currentPostId = null;
        this._byPostId = new Map();
    }

    /**
     * The user opened a post in the editor. Sends an explicit enter so
     * peers see the avatar within ~50ms (the read endpoint no longer
     * marks presence — that would have lit up analytics views too).
     * If the user was on a different post, leave that one first.
     */
    enterPost(postId) {
        if (!postId) {
            return;
        }
        if (this._currentPostId && this._currentPostId !== postId) {
            this.leavePost(this._currentPostId);
        }
        this._currentPostId = postId;
        const enterUrl = this.ghostPaths.url.api('presence', 'posts', postId, 'enter');
        fetch(enterUrl, {method: 'POST', credentials: 'include', keepalive: true})
            .catch(err => console.warn('[presence] enter failed', err)); // eslint-disable-line no-console
    }

    leavePost(postId) {
        if (!postId) {
            return;
        }
        if (this._currentPostId === postId) {
            this._currentPostId = null;
        }
        this._sendLeave(postId);
    }

    usersForPost(postId) {
        if (!postId) {
            return [];
        }
        const users = this._byPostId.get(postId) || [];
        const currentUserId = this.session.user?.id;
        if (!currentUserId) {
            return users;
        }
        return users.filter(user => user && user.id !== currentUserId);
    }

    _sendLeave(postId) {
        const leaveUrl = this.ghostPaths.url.api('presence', 'posts', postId, 'leave');
        // sendBeacon returns false when the UA's beacon queue is full
        // (Firefox enforces this); fall through to fetch so the leave
        // doesn't silently drop.
        const queued = typeof navigator !== 'undefined'
            && typeof navigator.sendBeacon === 'function'
            && navigator.sendBeacon(leaveUrl);
        if (queued) {
            return;
        }
        fetch(leaveUrl, {method: 'POST', credentials: 'include', keepalive: true})
            .catch(err => console.warn('[presence] leave failed', err)); // eslint-disable-line no-console
    }

    _handleMessage(event) {
        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch (e) {
            console.warn('[presence] malformed event payload, dropping', event.data); // eslint-disable-line no-console
            return;
        }

        if (payload?.type === EVENT_TYPE_SNAPSHOT && Array.isArray(payload.posts)) {
            const next = new Map();
            for (const entry of payload.posts) {
                if (entry?.postId && Array.isArray(entry.users)) {
                    next.set(entry.postId, entry.users);
                }
            }
            this._byPostId = next;
            return;
        }

        if (payload?.type === EVENT_TYPE_POST && payload.postId) {
            const next = new Map(this._byPostId);
            const users = Array.isArray(payload.users) ? payload.users : [];
            if (users.length === 0) {
                next.delete(payload.postId);
            } else {
                next.set(payload.postId, users);
            }
            this._byPostId = next;
        }
    }

    willDestroy() {
        super.willDestroy();
        this.stop();
    }
}
