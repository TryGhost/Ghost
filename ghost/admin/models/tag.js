var Tag = DS.Model.extend({
    uuid: DS.attr('string'),
    name: DS.attr('string'),
    slug: DS.attr('string'),
    description: DS.attr('string'),
    parent_id: DS.attr('number'),
    meta_title: DS.attr('string'),
    meta_description: DS.attr('string'),
    created_at: DS.attr('moment-date'),
    created_by: DS.belongsTo('user', {async: true}),
    updated_at: DS.attr('moment-date'),
    updated_by: DS.belongsTo('user', {async: true})
});

export default Tag;