var Tag = DS.Model.extend({
	uuid: DS.attr('string'),
	name: DS.attr('string'),
	slug: DS.attr('string'),
	description: DS.attr('string'),
	parent_id: DS.attr('number'),
	meta_title: DS.attr('string'),
	meta_description: DS.attr('string'),
	created_at: DS.attr('date'),
	created_by: DS.attr('number'),
	updated_at: DS.attr('date'),
	updated_by: DS.attr('number')
});

export default Tag;
