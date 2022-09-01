import TextArea from '@ember/component/text-area';
import TextInputMixin from 'ghost-admin/mixins/text-input';
import classic from 'ember-classic-decorator';
import {classNames} from '@ember-decorators/component';
import {run} from '@ember/runloop';
import {inject as service} from '@ember/service';

@classic
@classNames('gh-input')
export default class GhTextarea extends TextArea.extend(TextInputMixin) {
    @service resizeDetector;

    autoExpand = false;

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        // trigger auto-expand any time the value changes
        if (this.autoExpand) {
            run.scheduleOnce('afterRender', this, this._autoExpand);
        }
    }

    willInsertElement() {
        super.willInsertElement(...arguments);

        // disable the draggable resize element that browsers add to textareas
        if (this.autoExpand) {
            this.element.style.resize = 'none';
        }
    }

    didInsertElement() {
        super.didInsertElement(...arguments);

        // set up resize handler on element insert so that we can autoexpand
        // when the element container changes size
        if (this.autoExpand) {
            run.scheduleOnce('afterRender', this, this._setupAutoExpand);
        }

        if (this.didCreateTextarea) {
            this.didCreateTextarea(this.element);
        }
    }

    willDestroyElement() {
        this._teardownAutoExpand();
        super.willDestroyElement(...arguments);
    }

    _autoExpand() {
        let el = this.element;

        // collapse the element first so that we can shrink as well as expand
        // then set the height to match the text height
        if (el) {
            el.style.height = 0;
            el.style.height = `${el.scrollHeight}px`;
        }
    }

    _setupAutoExpand() {
        this._resizeCallback = run.bind(this, this._onResize);
        this.resizeDetector.setup(this.autoExpand, this._resizeCallback);
        this._autoExpand();
    }

    _onResize() {
        this._autoExpand();
    }

    _teardownAutoExpand() {
        this.resizeDetector.teardown(this.autoExpand, this._resizeCallback);
    }
}
