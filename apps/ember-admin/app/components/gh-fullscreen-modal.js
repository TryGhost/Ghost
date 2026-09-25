import Component from '@ember/component';
import RSVP from 'rsvp';
import {computed} from '@ember/object';
import {A as emberA} from '@ember/array';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

const FullScreenModalComponent = Component.extend({
    dropdown: service(),

    model: null,
    modifier: null,

    modalPath: computed('modal', function () {
        return `modal-${this.modal || 'unknown'}`;
    }),

    modalClasses: computed('modifier', function () {
        const modalClass = 'fullscreen-modal';
        const modifiers = (this.modifier || '').split(' ');
        const modalClasses = emberA([modalClass]);

        modifiers.forEach((modifier) => {
            if (!isBlank(modifier)) {
                const className = `${modalClass}-${modifier}`;
                modalClasses.push(className);
            }
        });

        return modalClasses.join(' ');
    }),

    didInsertElement() {
        this._super(...arguments);
        run.schedule('afterRender', this, function () {
            this.dropdown.closeDropdowns();
        });
    },

    actions: {
        close() {
            return this.close(...arguments);
        },

        confirm() {
            return this.confirm(...arguments);
        },

        clickOverlay() {
            this.send('close', ...arguments);
        }
    },

    // Allowed actions
    close: () => RSVP.resolve(),
    confirm: () => RSVP.resolve()
});

export default FullScreenModalComponent;
