import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {task} from 'ember-concurrency-decorators';
import {timeout} from 'ember-concurrency';
import {tracked} from '@glimmer/tracking';

export default class GhSiteIframeComponent extends Component {
    @service config;

    @tracked isInvisible = this.args.invisibleUntilLoaded;

    willDestroy() {
        this.args.onDestroyed?.();
    }

    get srcUrl() {
        return this.args.src || `${this.config.get('blogUrl')}/`;
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
                if (iframe.contentWindow.location.href !== this.srcUrl) {
                    iframe.contentWindow.location = this.srcUrl;
                } else {
                    iframe.contentWindow.location.reload();
                }
            }
        }
        this._lastGuid = this.args.guid;
    }

    @action
    onLoad(event) {
        if (this.args.invisibleUntilLoaded) {
            this.makeVisible.perform();
        }
        this.args.onLoad?.(event);
    }

    @task
    *makeVisible() {
        // give any scripts a bit of time to render before making visible
        // allows portal to render it's overlay and prevent site background flashes
        yield timeout(100);
        this.isInvisible = false;
    }
}
