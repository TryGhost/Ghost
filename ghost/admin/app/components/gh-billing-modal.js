/* global key */
import Component from '@ember/component';
import {computed} from '@ember/object';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default Component.extend({
    billing: service(),

    visibilityClass: computed('billing.billingWindowOpen', function () {
        return this.billing.get('billingWindowOpen') ? 'gh-billing' : 'gh-billing closed';
    }),

    didInsertElement() {
        this._super(...arguments);
        this._setupShortcuts();
    },

    willDestroyElement() {
        this._super(...arguments);
        this._removeShortcuts();
    },

    _setupShortcuts() {
        run(function () {
            document.activeElement.blur();
        });

        this._previousKeymasterScope = key.getScope();

        key('enter', 'modal', () => {
            this.send('confirm');
        });

        key.setScope('modal');
    },

    _removeShortcuts() {
        key.unbind('enter', 'modal');
        key.setScope(this._previousKeymasterScope);
    }
});
