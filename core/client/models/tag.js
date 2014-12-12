import ValidationEngine from 'ghost/mixins/validation-engine';
import NProgressSaveMixin from 'ghost/mixins/nprogress-save';

var Tag = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
    validationType: 'tag',

    uuid: DS.attr('string'),
    name: DS.attr('string'),
    slug: DS.attr('string'),
    description: DS.attr('string'),
    parent_id: DS.attr('number'),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    image: DS.attr('string')
});

export default Tag;
