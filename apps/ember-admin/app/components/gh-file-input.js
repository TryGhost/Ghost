import Component from '@glimmer/component';
import {action} from '@ember/object';
import {guidFor} from '@ember/object/internals';

export default class GhFileInput extends Component {
    inputId = `fileInput-${guidFor(this)}`;
    inputElement = null;

    get alt() {
        return this.args.alt === undefined ? 'Upload' : this.args.alt;
    }

    @action
    onChange(e) {
        e.stopPropagation();
        const files = this.files(e);

        if (files.length) {
            this.args.action?.(files, this.resetInput);
        }
    }

    @action
    registerFileInput(inputElement) {
        this.inputElement = inputElement;
        this.args.onInsert?.(this.inputElement);
    }

    /**
    * Resets the value of the input so you can select the same file
    * multiple times.
    *
    * NOTE: fixes reset in Firefox which doesn't reset like other browsers
    * when doing input.value = null;
    *
    * @method
    */
    @action
    resetInput() {
        const input = this.inputElement;
        input.removeAttribute('value');
        input.value = null;

        const clone = input.cloneNode(true);

        this.inputElement = clone;
        input.parentNode.replaceChild(clone, input);

        return clone;
    }

    /**
    * Gets files from event object.
    *
    * @method
    * @private
    * @param {$.Event || Event}
    */
    files(e) {
        return (e.originalEvent || e).testingFiles || e.originalEvent?.files || e.target.files || e.files;
    }
}
