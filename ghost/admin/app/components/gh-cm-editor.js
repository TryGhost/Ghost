import classic from 'ember-classic-decorator';
import {action} from '@ember/object';
import {classNameBindings} from '@ember-decorators/component';
import {inject as service} from '@ember/service';
/* global CodeMirror */
import Component from '@ember/component';
import boundOneWay from 'ghost-admin/utils/bound-one-way';
import {assign} from '@ember/polyfills';
import {bind, once, scheduleOnce} from '@ember/runloop';
import {task} from 'ember-concurrency';

@classic
@classNameBindings('isFocused:focus')
class CmEditorComponent extends Component {
    @service lazyLoader;

    textareaClass = '';
    isFocused = false;

    // options for the editor
    autofocus = false;

    indentUnit = 4;
    lineNumbers = true;
    lineWrapping = false;
    mode = 'htmlmixed';
    theme = 'xq-light';
    _editor = null; // reference to CodeMirror editor

    // Allowed actions
    'focus-in' = () => {};

    update = () => {};

    @boundOneWay('value')
        _value; // make sure a value exists

    didReceiveAttrs() {
        super.didReceiveAttrs(...arguments);

        if (this._value === null || undefined) {
            this.set('_value', '');
        }

        if (this.mode !== this._lastMode && this._editor) {
            this._editor.setOption('mode', this.mode);
        }
        this._lastMode = this.mode;
    }

    didInsertElement() {
        super.didInsertElement(...arguments);
        this.initCodeMirror.perform();
    }

    willDestroyElement() {
        super.willDestroyElement(...arguments);

        // Ensure the editor exists before trying to destroy it. This fixes
        // an error that occurs if codemirror hasn't finished loading before
        // the component is destroyed.
        if (this._editor) {
            let editor = this._editor.getWrapperElement();
            editor.parentNode.removeChild(editor);
            this._editor = null;
        }
    }

    @action
    updateFromTextarea(value) {
        this.update(value);
    }

    @task(function* () {
        let loader = this.lazyLoader;
        yield loader.loadScript('codemirror', 'assets/codemirror/codemirror.js');

        scheduleOnce('afterRender', this, this._initCodeMirror);
    })
        initCodeMirror;

    _initCodeMirror() {
        let options = this.getProperties('lineNumbers', 'lineWrapping', 'indentUnit', 'mode', 'theme', 'autofocus');
        assign(options, {value: this._value});

        let textarea = this.element.querySelector('textarea');
        if (textarea && textarea === document.activeElement) {
            options.autofocus = true;
        }

        this._editor = new CodeMirror.fromTextArea(textarea, options);

        // by default CodeMirror will place the cursor at the beginning of the
        // content, it makes more sense for the cursor to be at the end
        if (options.autofocus) {
            this._editor.setCursor(this._editor.lineCount(), 0);
        }

        // events
        this._setupCodeMirrorEventHandler('focus', this, this._focus);
        this._setupCodeMirrorEventHandler('blur', this, this._blur);
        this._setupCodeMirrorEventHandler('change', this, this._update);
    }

    _setupCodeMirrorEventHandler(event, target, method) {
        let callback = bind(target, method);

        this._editor.on(event, callback);

        this.one('willDestroyElement', this, function () {
            this._editor.off(event, callback);
        });
    }

    _update(codeMirror, changeObj) {
        once(this, this.update, codeMirror.getValue(), codeMirror, changeObj);
    }

    _focus(codeMirror, event) {
        this.set('isFocused', true);
        once(this, this['focus-in'], codeMirror.getValue(), codeMirror, event);
    }

    _blur/* codeMirror, event */() {
        this.set('isFocused', false);
    }
}

export default CmEditorComponent;
