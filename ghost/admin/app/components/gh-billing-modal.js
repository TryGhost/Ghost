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

    actions: {
        closeModal() {
            this.billing.closeBillingWindow();
        }
    },

    _setupShortcuts() {
        run(function () {
            document.activeElement.blur();
        });

        this._previousKeymasterScope = key.getScope();

        key('enter', 'modal', () => {
            this.send('confirm');
        });

        key('escape', 'modal', () => {
            this.send('closeModal');
        });

        key.setScope('modal');
    },

    _removeShortcuts() {
        key.unbind('enter', 'modal');
        key.unbind('escape', 'modal');
        key.setScope(this._previousKeymasterScope);
    }
});
