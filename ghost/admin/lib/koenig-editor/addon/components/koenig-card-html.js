import Component from '@ember/component';
import layout from '../templates/components/koenig-card-html';
import {computed} from '@ember/object';
import {utils as ghostHelperUtils} from '@tryghost/helpers';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {set} from '@ember/object';

const {countWords, countImages} = ghostHelperUtils;

export default Component.extend({
    layout,

    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,
    headerOffset: 0,

    // closure actions
    selectCard() {},
    deselectCard() {},
    editCard() {},
    saveCard() {},
    deleteCard() {},
    registerComponent() {},

    counts: computed('payload.html', function () {
        return {
            wordCount: countWords(this.payload.html),
            imageCount: countImages(this.payload.html)
        };
    }),

    toolbar: computed('isEditing', function () {
        if (this.isEditing) {
            return false;
        }

        return {
            items: [{
                buttonClass: 'fw4 flex items-center white',
                icon: 'koenig/kg-edit',
                iconClass: 'fill-white',
                title: 'Edit',
                text: '',
                action: run.bind(this, this.editCard)
            }]
        };
    }),

    init() {
        this._super(...arguments);
        let payload = this.payload || {};

        // CodeMirror errors on a `null` or `undefined` value
        if (!payload.html) {
            set(payload, 'html', '');
        }

        this.set('payload', payload);

        this.registerComponent(this);
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
