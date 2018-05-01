import Component from '@ember/component';
import layout from '../templates/components/koenig-card-html';
import {computed} from '@ember/object';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {set} from '@ember/object';

export default Component.extend({
    layout,

    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,
    headerOffset: 0,

    // closure actions
    editCard() {},
    saveCard() {},
    selectCard() {},
    deleteCard() {},

    toolbar: computed('isEditing', function () {
        if (!this.isEditing) {
            return {
                items: [{
                    buttonClass: 'fw4 flex items-center white',
                    icon: 'koenig/kg-edit-v2',
                    iconClass: 'stroke-white',
                    title: 'Edit',
                    text: '',
                    action: run.bind(this, this.editCard)
                }]
            };
        }
    }),

    init() {
        this._super(...arguments);
        let payload = this.payload || {};

        if (!payload.html) {
            payload.set('html', '');
        }

        this.set('payload', payload);
    },

    actions: {
        updateHtml(html) {
            this._updatePayloadAttr('html', html);
        },

        leaveEditMode() {
            if (isBlank(this.payload.html)) {
                // afterRender is required to avoid double modification of `isSelected`
                // TODO: see if there's a way to avoid afterRender
                run.scheduleOnce('afterRender', this, function () {
                    this.deleteCard();
                });
            }
        }
    },

    _updatePayloadAttr(attr, value) {
        let payload = this.payload;
        let save = this.saveCard;

        set(payload, attr, value);

        // update the mobiledoc and stay in edit mode
        save(payload, false);
    }
});
