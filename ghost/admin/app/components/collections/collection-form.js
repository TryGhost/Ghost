import Component from '@glimmer/component';
import {action} from '@ember/object';
import {inject} from 'ghost-admin/decorators/inject';
import {inject as service} from '@ember/service';
import {slugify} from '@tryghost/string';

const TYPES = [{
    name: 'Manual',
    value: 'manual'
}, {
    name: 'Automatic',
    value: 'automatic'
}];

export default class CollectionForm extends Component {
    @service feature;
    @service settings;

    @inject config;

    availableTypes = TYPES;

    get selectedType() {
        const {collection} = this.args;
        return this.availableTypes.findBy('value', collection.type) || {value: '!unknown'};
    }

    @action
    setCollectionProperty(property, newValue) {
        const {collection} = this.args;

        if (newValue) {
            newValue = newValue.trim();
        }

        // Generate slug based on name for new collection when empty
        if (property === 'title' && collection.isNew && !this.hasChangedSlug) {
            let slugValue = slugify(newValue);
            if (/^#/.test(newValue)) {
                slugValue = 'hash-' + slugValue;
            }
            collection.slug = slugValue;
        }

        // ensure manual changes of slug don't get reset when changing name
        if (property === 'slug') {
            this.hasChangedSlug = !!newValue;
        }

        collection[property] = newValue;

        // clear validation message when typing
        collection.hasValidated.addObject(property);
    }

    @action
    changeType(type) {
        this.setCollectionProperty('type', type.value);
    }

    @action
    validateCollectionProperty(property) {
        return this.args.collection.validate({property});
    }
}
