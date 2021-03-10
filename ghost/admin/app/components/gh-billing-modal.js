import Component from '@ember/component';
import {computed} from '@ember/object';
import {inject as service} from '@ember/service';

export default Component.extend({
    billing: service(),

    visibilityClass: computed('billingWindowOpen', function () {
        return this.billingWindowOpen ? 'gh-billing' : 'gh-billing closed';
    })
});
