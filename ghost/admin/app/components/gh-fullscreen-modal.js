import Component from '@ember/component';
import RSVP from 'rsvp';
import {computed} from '@ember/object';
import {A as emberA} from '@ember/array';
import {invokeAction} from 'ember-invoke-action';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const FullScreenModalComponent = Component.extend({
    dropdown: service(),

    model: null,
    modifier: null,

    modalPath: computed('modal', function () {
        return `modal-${this.get('modal') || 'unknown'}`;
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

    didInsertElement() {
        run.schedule('afterRender', this, function () {
            this.get('dropdown').closeDropdowns();
        });
    },

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
