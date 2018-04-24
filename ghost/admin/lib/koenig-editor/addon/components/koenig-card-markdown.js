import Component from '@ember/component';
import formatMarkdown from 'ghost-admin/utils/format-markdown';
import layout from '../templates/components/koenig-card-markdown';
import {computed} from '@ember/object';
import {htmlSafe} from '@ember/string';
import {isBlank} from '@ember/utils';
import {run} from '@ember/runloop';
import {set} from '@ember/object';

export default Component.extend({
    layout,

    // attrs
    payload: null,
    isSelected: false,
    isEditing: false,

    // closure actions
    editCard() {},
    saveCard() {},
    selectCard() {},
    deleteCard() {},

    renderedMarkdown: computed('payload.markdown', function () {
        return htmlSafe(formatMarkdown(this.get('payload.markdown')));
    }),

    toolbar: computed('isEditing', function () {
        if (!this.get('isEditing')) {
            return {
                items: [{
                    buttonClass: 'fw4 flex items-center white',
                    icon: 'koenig/kg-edit-v2',
                    iconClass: 'stroke-white',
                    title: 'Edit',
                    text: '',
                    action: run.bind(this, this.get('editCard'))
                }]
            };
        }
    }),

    actions: {
        enterEditMode() {
            // this action is called before the component is rendered so we
            // need to wait to ensure that the textarea element is present
            run.scheduleOnce('afterRender', this, this._focusTextarea);
        },

        leaveEditMode() {
            if (isBlank(this.get('payload.markdown'))) {
                // afterRender is required to avoid double modification of `isSelected`
                // TODO: see if there's a way to avoid afterRender
                run.scheduleOnce('afterRender', this, function () {
                    this.deleteCard();
                });
            }
        },

        updateMarkdown(markdown) {
            let payload = this.get('payload');
            let save = this.get('saveCard');

            set(payload, 'markdown', markdown);

            // update the mobiledoc and stay in edit mode
            save(payload, false);
        }
    },

    _focusTextarea() {
        this.element.querySelector('textarea').focus();
    }
});
