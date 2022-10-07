import BaseValidator from './base';
import validator from 'validator';
import {isBlank} from '@ember/utils';

export default BaseValidator.create({
    properties: ['name', 'slug', 'description', 'metaTitle', 'metaDescription'],

    name(model) {
        let name = model.name;

        if (isBlank(name)) {
            model.errors.add('name', 'You must specify a name for the tag.');
            this.invalidate();
        } else if (name.match(/^,/)) {
            model.errors.add('name', 'Tag names can\'t start with commas.');
            this.invalidate();
        } else if (!validator.isLength(name, 0, 191)) {
            model.errors.add('name', 'Tag names cannot be longer than 191 characters.');
            this.invalidate();
        }
    },

    slug(model) {
        let slug = model.slug;

        if (!validator.isLength(slug || '', 0, 191)) {
            model.errors.add('slug', 'URL cannot be longer than 191 characters.');
            this.invalidate();
        }
    },

    description(model) {
        let description = model.description;

        if (!validator.isLength(description || '', 0, 500)) {
            model.errors.add('description', 'Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    },

    metaTitle(model) {
        let metaTitle = model.metaTitle;

        if (!validator.isLength(metaTitle || '', 0, 300)) {
            model.errors.add('metaTitle', 'Meta Title cannot be longer than 300 characters.');
            this.invalidate();
        }
    },

    metaDescription(model) {
        let metaDescription = model.metaDescription;

        if (!validator.isLength(metaDescription || '', 0, 500)) {
            model.errors.add('metaDescription', 'Meta Description cannot be longer than 500 characters.');
            this.invalidate();
        }
    }
});
