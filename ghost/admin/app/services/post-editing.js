import Service from '@ember/service';
import {inject as service} from '@ember/service';

export default class PostEditingService extends Service {
    @service ajax;
    @service ghostPaths;

    generateSessionId() {
        if (window.crypto?.randomUUID) {
            return window.crypto.randomUUID();
        }

        return `editing-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }

    async touch({postId, postType, sessionId}) {
        const url = new URL(this.ghostPaths.url.api(this._resourcePath(postType), postId, 'editing'), window.location.href);
        url.searchParams.set('session_id', sessionId);

        const response = await this.ajax.request(url.href, {
            method: 'POST'
        });

        return response[this._resourcePath(postType)]?.[0] || null;
    }

    async release({postId, postType, sessionId}) {
        const url = new URL(this.ghostPaths.url.api(this._resourcePath(postType), postId, 'editing'), window.location.href);
        url.searchParams.set('session_id', sessionId);

        await this.ajax.request(url.href, {
            method: 'DELETE'
        });
    }

    _resourcePath(postType) {
        return postType === 'page' ? 'pages' : 'posts';
    }
}
