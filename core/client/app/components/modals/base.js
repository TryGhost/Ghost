/* global key */
import Ember from 'ember';

const {Component, run} = Ember;

export default Component.extend({
    tagName: 'section',
    classNames: 'modal-content',

    _previousKeymasterScope: null,

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
    },

    didInsertElement() {
        this._super(...arguments);
        this._setupShortcuts();
    },

    willDestroyElement() {
        this._super(...arguments);
        this._removeShortcuts();
    },

    actions: {
        confirm() {
            throw new Error('You must override the "confirm" action in your modal component');
        },

        closeModal() {
            this.attrs.closeModal();
        }
    }
});
