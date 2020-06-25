import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    config: service(),
    tagName: '',
    srcUrl: computed('src', function () {
        return this.src || `${this.config.get('blogUrl')}/`;
    }),
    didReceiveAttrs() {
        // reset the src attribute each time the guid changes - allows for
        // a click on the navigation item to reset back to the homepage
        if ((this.guid !== this._lastGuid) || (this.src !== this._lastSrc)) {
            let iframe = document.querySelector('#site-frame');
            if (iframe) {
                iframe.src = this.src || `${this.config.get('blogUrl')}/`;
            }
        }
        this._lastGuid = this.guid;
        this._lastSrc = this.src;
    }
});
