import ValidationEngine from 'ghost/mixins/validation-engine';
import NProgressSaveMixin from 'ghost/mixins/nprogress-save';

var Tag = DS.Model.extend(NProgressSaveMixin, ValidationEngine, {
    validationType: 'tag',

    uuid: DS.attr('string'),
    name: DS.attr('string'),
    slug: DS.attr('string'),
    description: DS.attr('string'),
    parent: DS.attr(),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    image: DS.attr('string'),
    hidden: DS.attr('boolean'),
    created_at: DS.attr('moment-date'),
    updated_at: DS.attr('moment-date'),
    created_by: DS.attr(),
    updated_by: DS.attr(),
    post_count: DS.attr('number')
});

export default Tag;
