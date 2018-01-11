import OneWayTextarea from 'ember-one-way-controls/components/one-way-textarea';
import TextInputMixin from 'ghost-admin/mixins/text-input';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

export default OneWayTextarea.extend(TextInputMixin, {
    resizeDetector: service(),

    classNames: 'gh-input',

    autoExpand: false,

    didReceiveAttrs() {
        this._super(...arguments);

        // trigger auto-expand any time the value changes
        if (this.get('autoExpand')) {
            run.scheduleOnce('afterRender', this, this._autoExpand);
        }
    },

    didInsertElement() {
        this._super(...arguments);

        // set up resize handler on element insert so that we can autoexpand
        // when the element container changes size
        if (this.get('autoExpand')) {
            run.scheduleOnce('afterRender', this, this._setupAutoExpand);
        }
    },

    willDestroyElement() {
        this._teardownAutoExpand();
        this._super(...arguments);
    },

    willInsertElement() {
        this._super(...arguments);

        // disable the draggable resize element that browsers add to textareas
        if (this.get('autoExpand')) {
            this.element.style.resize = 'none';
        }
    },

    _autoExpand() {
        let el = this.element;

        // collapse the element first so that we can shrink as well as expand
        // then set the height to match the text height
        if (el) {
            el.style.height = 0;
            el.style.height = `${el.scrollHeight}px`;
        }
    },

    _setupAutoExpand() {
        this._resizeCallback = run.bind(this, this._onResize);
        this.get('resizeDetector').setup(this.get('autoExpand'), this._resizeCallback);
        this._autoExpand();
    },

    _onResize() {
        this._autoExpand();
    },

    _teardownAutoExpand() {
        this.get('resizeDetector').teardown(this.get('autoExpand'), this._resizeCallback);
    }
});
