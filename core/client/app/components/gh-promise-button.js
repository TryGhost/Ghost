import Ember from 'ember';
import {strictInvokeAction, invokeAction} from 'ember-invoke-action';

const {Component, computed, run} = Ember;

/**
 * Promise-enabled buttons. PromiseButton is a component that will take a promise,
 * render as a button, and when clicked, will trigger the promise and then show its state
 * once the promise has either resolved or rejected.
 *
 * Usage:
 * ```handlebars
 * {{#gh-promise-button class="btn btn-sm" promise=(action 'callServer')}}
 *     Click Me!
 * {{/gh-promise-button}}
 * ```
 *
 * The `promise` variable is a closure action that must return a promise. If not,
 * unexpected behavior may occur. The promise option is the only one that _needs_
 * to be specified.
 *
 * @class PromiseButton
 * @extends Ember.Component
 */
export default Component.extend({
    tagName: '',
    color: 'blue',

    /**
     * Promise function (either using a string or a closure function)
     *
     * @property promise
     * @type String|Function
     */

    /**
     * If you are rendering the promise button as an inline component and not
     * in block form, set this to whatever text you want the button to display.
     *
     * @property buttonText
     * @type {String}
     * @default ''
     */
    buttonText: '',

    /**
     * Boolean value that tells whether or not the button's width needs to stay
     * constant regardless of state.
     *
     * @property autoWidth
     * @type {Boolean}
     * @default true
     */
    autoWidth: true,

    /**
     * External control for the disabled state of the button. This is different
     * than the regular `disabled` setting because the state of the button
     * will automatically modify whether or not the button is spinning based on
     * whether or not the promise is in the process of running.
     *
     * @property disableWhen
     * @type {Boolean}
     * @default false
     */
    disableWhen: false,

    /**
     * Holds the state of the button. Can be an empty object (no state, promise has
     * not been clicked), rejected (promse has rejected), or resolved (promise has resolved)
     *
     * @private
     * @property state
     * @type {Object}
     */
    state: {},

    /**
     * The time that the state of the button should be shown before returning to
     * default. Time must be specified in milliseconds.
     *
     * @property timeout
     * @type {Number}
     * @default 3000
     */
    timeout: 3000,

    /**
     * Private instance variable holding whether or not the button is currently
     * submitting the promise. Used to modify the spinning state of `fw-spin-button`
     *
     * @private
     * @property submitting
     * @type {Boolean}
     */
    submitting: false,

    /**
     * Holds the Ember.run function responsible for resetting the state of a button
     * after the specified `timeout`.
     *
     * @private
     * @property showStateTimeout
     */
    showStateTimeout: null,

    buttonState: computed('state', 'color', function () {
        let state = this.get('state');

        if (state.rejected) {
            return 'btn-red';
        } else if (state.resolved) {
            return 'btn-green';
        } else {
            return `btn-${this.get('color')}`;
        }
    }),

    concatenatedClasses: computed('class', 'buttonState', function () {
        let classes = [this.get('class')];

        classes.push(this.get('buttonState'));

        return classes.join(' ');
    }),

    _showState(state) {
        this.set('state', state);

        this.set('showStateTimeout', run.later(this, function () {
            this.set('state', {});
            this.set('showStateTimeout', null);
        }, this.get('timeout')));
    },

    willDestroy() {
        this._super(...arguments);
        run.cancel(this.get('showStateTimeout'));
    },

    actions: {
        click() {
            this.set('submitting', true);
            this.set('state', {});

            strictInvokeAction(this, 'promise').then(() => {
                this.set('submitting', false);
                this._showState({resolved: true});
                invokeAction(this, 'onsuccess', ...arguments);
            }).catch(() => {
                this.set('submitting', false);
                this._showState({rejected: true});
                invokeAction(this, 'onerror', ...arguments);
            });
        }
    }
});
