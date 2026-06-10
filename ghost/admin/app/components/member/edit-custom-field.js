import Component from '@glimmer/component';
import {action} from '@ember/object';
import {tracked} from '@glimmer/tracking';

// POC: edits a single custom field's value in a modal. On Save it resolves with
// the new value via @close; the caller applies it to the member's working copy
// (so it still only persists when the member is saved).
export default class EditCustomFieldModal extends Component {
    @tracked value;

    constructor() {
        super(...arguments);
        const initial = this.args.data.value;
        if (this.field.type === 'boolean') {
            this.value = Boolean(initial);
        } else if (this.isMultiSelect) {
            this.value = Array.isArray(initial) ? [...initial] : [];
        } else {
            this.value = initial ?? '';
        }
    }

    get field() {
        return this.args.data.field;
    }

    get isBoolean() {
        return this.field.type === 'boolean';
    }

    get isNumber() {
        return this.field.type === 'number';
    }

    get isSingleSelect() {
        return this.field.type === 'select' && !this.field.multiple;
    }

    get isMultiSelect() {
        return this.field.type === 'select' && this.field.multiple;
    }

    get options() {
        return (this.field.options || []).map(option => ({
            value: option,
            selected: this.isMultiSelect ? this.value.includes(option) : this.value === option
        }));
    }

    @action
    updateText(event) {
        this.value = event.target.value;
    }

    @action
    updateNumber(event) {
        const raw = event.target.value;
        this.value = raw === '' ? null : Number(raw);
    }

    @action
    updateBoolean(event) {
        this.value = event.target.checked;
    }

    @action
    updateSingleSelect(event) {
        this.value = event.target.value || null;
    }

    @action
    toggleMultiOption(option) {
        const current = Array.isArray(this.value) ? this.value : [];
        this.value = current.includes(option) ? current.filter(o => o !== option) : [...current, option];
    }

    @action
    save() {
        this.args.close({value: this.value});
    }
}
