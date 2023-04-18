import Ember from 'ember';
import Model, {attr} from '@ember-data/model';
import ValidationEngine from 'ghost-admin/mixins/validation-engine';
import {inject} from 'ghost-admin/decorators/inject';

// ember-cli-shims doesn't export these so we must get them manually
const {Comparable} = Ember;

export default Model.extend(Comparable, ValidationEngine, {
    config: inject(),

    displayName: 'post_revision',
    validationType: 'post_revision',

    lexical: attr('string'),
    title: attr('string')
});
