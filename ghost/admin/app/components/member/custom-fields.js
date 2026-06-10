import * as customFields from '../../utils/custom-fields-poc';
import Component from '@glimmer/component';
import EditCustomFieldModal from './edit-custom-field';
import {action} from '@ember/object';
import {inject as service} from '@ember/service';
import {tracked} from '@glimmer/tracking';

// POC: read-only list of the member's custom fields. Each row opens a modal to
// edit its value (type-specific input lives in the modal). Values + updates flow
// through @values / @onUpdate so edits join the member's dirty/Save flow.
const TYPE_LABELS = {
    text: 'Text',
    number: 'Number',
    boolean: 'True / False',
    select: 'List'
};

export default class MemberCustomFields extends Component {
    @service modals;

    @tracked fields = [];

    constructor() {
        super(...arguments);
        this.loadFields();
        this.unsubscribe = customFields.subscribe(() => this.loadFields());
    }

    willDestroy() {
        super.willDestroy(...arguments);
        if (this.unsubscribe) {
            this.unsubscribe();
        }
    }

    loadFields() {
        this.fields = customFields.listFields().filter(field => !field.archived);
    }

    get values() {
        return this.args.values || {};
    }

    formatValue(field, value) {
        if (customFields.isEmptyValue(value)) {
            return null;
        }
        if (field.type === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        if (field.type === 'select' && field.multiple) {
            return (Array.isArray(value) && value.length) ? value.join(', ') : null;
        }
        return String(value);
    }

    get rows() {
        return this.fields.map((field) => {
            const displayValue = this.formatValue(field, this.values[field.id]);
            return {
                field,
                typeLabel: TYPE_LABELS[field.type] || field.type,
                displayValue,
                hasValue: displayValue !== null
            };
        });
    }

    @action
    async editField(field) {
        const result = await this.modals.open(EditCustomFieldModal, {
            field,
            value: this.values[field.id]
        });
        if (result && this.args.onUpdate) {
            this.args.onUpdate(field.id, result.value);
        }
    }
}
