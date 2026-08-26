import Service, {inject as service} from '@ember/service';
import fetch from 'fetch';
import {tracked} from '@glimmer/tracking';

// Must match PRESENCE_EVENT_TYPES in post-presence-service.ts
const EVENT_TYPE_SNAPSHOT = 'snapshot';
const EVENT_TYPE_POST = 'post';

const CONNECTING_ERROR_LOG_THRESHOLD = 3;

export default class PresenceService extends Service {
    @service ghostPaths;
    @service session;

    @tracked _byPostId = new Map();

    _source = null;
    _currentPostId = null;
    _beforeUnloadHandler = null;
    _connectingErrorCount = 0;
    _connectingErrorLogged = false;

    start() {
        const alreadyStarted = Boolean(this._source);
        const eventSourceUnavailable = typeof window === 'undefined' || !window.EventSource;
        if (alreadyStarted || eventSourceUnavailable) {
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
        this._source.onopen = () => this._onStreamOpen();
        this._source.onerror = () => this._onStreamError();
        this._bindPagehide();
    }

    stop() {
        if (this._currentPostId) {
            this._sendLeave(this._currentPostId);
        }
        if (this._source) {
            this._source.close();
            this._source = null;
        }
        this._unbindPagehide();
        this._currentPostId = null;
        this._byPostId = new Map();
    }

    enterPost(postId) {
        if (!postId) {
            return;
        }
        if (!this._source) {
            this.start();
        }
        const switchingPost = this._currentPostId && this._currentPostId !== postId;
        if (switchingPost) {
            this.leavePost(this._currentPostId);
        }
        this._currentPostId = postId;
        this._sendEnter(postId);
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

    willDestroy() {
        super.willDestroy();
        this.stop();
    }

    _onStreamOpen() {
        this._connectingErrorLogged = false;
        this._connectingErrorCount = 0;
        if (this._currentPostId) {
            this._sendEnter(this._currentPostId);
        }
    }

    _onStreamError() {
        if (!this._source) {
            return;
        }
        const isClosed = this._source.readyState === EventSource.CLOSED;
        const isConnecting = this._source.readyState === EventSource.CONNECTING;
        if (isClosed) {
            console.warn('[presence] SSE stream closed; not reconnecting'); // eslint-disable-line no-console
            return;
        }
        if (!isConnecting) {
            return;
        }
        this._connectingErrorCount += 1;
        const shouldLogReconnects = this._connectingErrorCount >= CONNECTING_ERROR_LOG_THRESHOLD
            && !this._connectingErrorLogged;
        if (shouldLogReconnects) {
            this._connectingErrorLogged = true;
            console.warn('[presence] SSE reconnects are failing'); // eslint-disable-line no-console
        }
    }

    _bindPagehide() {
        this._beforeUnloadHandler = () => {
            if (this._currentPostId) {
                this._sendLeave(this._currentPostId);
            }
        };
        window.addEventListener('pagehide', this._beforeUnloadHandler);
    }

    _unbindPagehide() {
        if (!this._beforeUnloadHandler) {
            return;
        }
        window.removeEventListener('pagehide', this._beforeUnloadHandler);
        this._beforeUnloadHandler = null;
    }

    _sendEnter(postId) {
        const enterUrl = this.ghostPaths.url.api('presence', 'posts', postId, 'enter');
        fetch(enterUrl, {method: 'POST', credentials: 'include', keepalive: true})
            .catch(err => console.warn('[presence] enter failed', err)); // eslint-disable-line no-console
    }

    _sendLeave(postId) {
        const leaveUrl = this.ghostPaths.url.api('presence', 'posts', postId, 'leave');
        const canSendBeacon = typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function';
        const queued = canSendBeacon && navigator.sendBeacon(leaveUrl);
        if (queued) {
            return;
        }
        fetch(leaveUrl, {method: 'POST', credentials: 'include', keepalive: true})
            .catch(err => console.warn('[presence] leave failed', err)); // eslint-disable-line no-console
    }

    _handleMessage(event) {
        this._connectingErrorCount = 0;
        this._connectingErrorLogged = false;

        let payload;
        try {
            payload = JSON.parse(event.data);
        } catch (e) {
            console.warn('[presence] malformed event payload, dropping', {err: e, data: event.data}); // eslint-disable-line no-console
            return;
        }

        const isSnapshot = payload?.type === EVENT_TYPE_SNAPSHOT && Array.isArray(payload.posts);
        const isPostEvent = payload?.type === EVENT_TYPE_POST && payload.postId;

        if (isSnapshot) {
            this._applySnapshot(payload.posts);
            return;
        }

        if (isPostEvent) {
            this._applyPostEvent(payload);
        }
    }

    _applySnapshot(posts) {
        const next = new Map();
        for (const entry of posts) {
            const hasUsers = entry?.postId && Array.isArray(entry.users);
            if (hasUsers) {
                next.set(entry.postId, entry.users);
            }
        }
        this._byPostId = next;
    }

    _applyPostEvent(payload) {
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
