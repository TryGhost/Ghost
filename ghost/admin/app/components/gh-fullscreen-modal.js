import RSVP from 'rsvp';
import injectService from 'ember-service/inject';
import {A as emberA} from 'ember-array/utils';
import {isBlank} from 'ember-utils';
import on from 'ember-evented/on';
import run from 'ember-runloop';
import {invokeAction} from 'ember-invoke-action';
import computed from 'ember-computed';
import Component from 'ember-component';

const FullScreenModalComponent = Component.extend({

    model: null,
    modifier: null,

    dropdown: injectService(),

    modalPath: computed('modal', function () {
        return `modals/${this.get('modal') || 'unknown'}`;
    }),

    modalClasses: computed('modifiers', function () {
        let modalClass = 'fullscreen-modal';
        let modifiers = (this.get('modifier') || '').split(' ');
        let modalClasses = emberA([modalClass]);

        modifiers.forEach((modifier) => {
            if (!isBlank(modifier)) {
                let className = `${modalClass}-${modifier}`;
                modalClasses.push(className);
            }
        });

        return modalClasses.join(' ');
    }),

    closeDropdowns: on('didInsertElement', function () {
        run.schedule('afterRender', this, function () {
            this.get('dropdown').closeDropdowns();
        });
    }),

    actions: {
        close() {
            // Because we return the promise from invokeAction, we have
            // to check if "close" exists first
            if (this.get('close')) {
                return invokeAction(this, 'close');
            }

            return RSVP.resolve();
        },

        confirm() {
            if (this.get('confirm')) {
                return invokeAction(this, 'confirm');
            }

            return RSVP.resolve();
        },

        clickOverlay() {
            this.send('close');
        }
    }
});

FullScreenModalComponent.reopenClass({
    positionalParams: ['modal']
});

export default FullScreenModalComponent;
