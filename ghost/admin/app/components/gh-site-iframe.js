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
        // reset the src attribute each time the guid changes - allows for
        // a click on the navigation item to reset back to the homepage
        if (this.args.guid !== this._lastGuid) {
            if (iframe) {
                iframe.src = this.srcUrl;
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
