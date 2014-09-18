var Tag = DS.Model.extend({
    uuid: DS.attr('string'),
    name: DS.attr('string'),
    slug: DS.attr('string'),
    description: DS.attr('string'),
    parent_id: DS.attr('number'),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
});

export default Tag;