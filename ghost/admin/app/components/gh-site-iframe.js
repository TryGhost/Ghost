import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {task, timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhSiteIframeComponent extends Component {
    @inject config;

    @tracked isInvisible = this.args.invisibleUntilLoaded;

    willDestroy() {
        super.willDestroy?.(...arguments);

        if (this.messageListener) {
            window.removeEventListener('message', this.messageListener);
        }
        this.args.onDestroyed?.();
    }

    get srcUrl() {
        const srcUrl = new URL(this.args.src || `${this.config.blogUrl}/`);

        if (this.args.guid) {
            srcUrl.searchParams.set('v', this.args.guid);
        }

        return srcUrl.href;
    }

    @action
    resetSrcAttribute(iframe) {
        // reset the src attribute and force reload each time the guid changes
        // - allows for a click on the navigation item to reset back to the homepage
        //   or a portal preview modal to force a reload so it can fetch server-side data
        if (this.args.guid !== this._lastGuid) {
            if (iframe) {
                if (this.args.invisibleUntilLoaded) {
                    this.isInvisible = true;
                }

                try {
                    if (iframe.contentWindow.location.href !== this.srcUrl) {
                        iframe.contentWindow.location = this.srcUrl;
                    } else {
                        iframe.contentWindow.location.reload();
                    }
                } catch (e) {
                    if (e.name === 'SecurityError') {
                        iframe.src = this.srcUrl;
                    }
                }
            }
        }
        this._lastGuid = this.args.guid;
    }

    @action
    onLoad(event) {
        this.iframe = event.target;

        if (this.args.invisibleUntilLoaded && typeof this.args.invisibleUntilLoaded === 'boolean') {
            this.makeVisible.perform();
        } else {
            this.args.onLoad?.(this.iframe);
        }
    }

    @action
    attachMessageListener() {
        if (typeof this.args.invisibleUntilLoaded === 'string') {
            this.messageListener = (event) => {
                if (this.isDestroying || this.isDestroyed) {
                    return;
                }

                const srcURL = new URL(this.srcUrl);
                const originURL = new URL(event.origin);

                if (originURL.origin === srcURL.origin) {
                    if (event.data === this.args.invisibleUntilLoaded || event.data.type === this.args.invisibleUntilLoaded) {
                        this.makeVisible.perform();
                    }
                }
            };

            window.addEventListener('message', this.messageListener, true);
        }
    }

    @task
    *makeVisible() {
        // give any scripts a bit of time to render before making visible
        // allows portal to render it's overlay and prevent site background flashes
        yield timeout(100);
        this.isInvisible = false;
        this.args.onLoad?.(this.iframe);
    }
}
