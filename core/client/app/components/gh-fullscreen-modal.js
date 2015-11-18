import Ember from 'ember';
import LiquidTether from 'liquid-tether/components/liquid-tether';

const {RSVP, isBlank, on, run} = Ember;
const emberA = Ember.A;

const FullScreenModalComponent = LiquidTether.extend({
    to: 'fullscreen-modal',
    target: 'document.body',
    targetModifier: 'visible',
    targetAttachment: 'top center',
    attachment: 'top center',
    tetherClass: 'fullscreen-modal',
    overlayClass: 'fullscreen-modal-background',
    modalPath: 'unknown',

    dropdown: Ember.inject.service(),

    init() {
        this._super(...arguments);
        this.modalPath = `modals/${this.get('modal')}`;
    },

    setTetherClass: on('init', function () {
        let tetherClass = this.get('tetherClass');
        let modifiers = (this.get('modifier') || '').split(' ');
        let tetherClasses = emberA([tetherClass]);

        modifiers.forEach((modifier) => {
            if (!isBlank(modifier)) {
                let className = `${tetherClass}-${modifier}`;
                tetherClasses.push(className);
            }
        });

        this.set('tetherClass', tetherClasses.join(' '));
    }),

    closeDropdowns: on('didInsertElement', function () {
        run.schedule('afterRender', this, function () {
            this.get('dropdown').closeDropdowns();
        });
    }),

    actions: {
        close() {
            if (this.attrs.close) {
                return this.attrs.close();
            }

            return new RSVP.Promise((resolve) => {
                resolve();
            });
        },

        confirm() {
            if (this.attrs.confirm) {
                return this.attrs.confirm();
            }

            return new RSVP.Promise((resolve) => {
                resolve();
            });
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
