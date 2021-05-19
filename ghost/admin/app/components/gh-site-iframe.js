import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
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
            this.isInvisible = false;
        }
        this.args.onLoad?.(event);
    }
}
