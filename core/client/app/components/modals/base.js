/* global key */
import Ember from 'ember';

const {Component, on, run} = Ember;

export default Component.extend({
    tagName: 'section',
    classNames: 'modal-content',

    _previousKeymasterScope: null,

    setupShortcuts: on('didInsertElement', function () {
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
    }),

    removeShortcuts: on('willDestroyElement', function () {
        key.unbind('enter', 'modal');
        key.unbind('escape', 'modal');

        key.setScope(this._previousKeymasterScope);
    }),

    actions: {
        confirm() {
            throw new Error('You must override the "confirm" action in your modal component');
        },

        closeModal() {
            this.attrs.closeModal();
        }
    }
});
