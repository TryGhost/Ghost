var Role = DS.Model.extend({
    uuid: DS.attr('string'),
    name: DS.attr('string'),
    description: DS.attr('string'),
    lowerCaseName: Ember.computed('name', function () {
        return this.get('name').toLocaleLowerCase();
    })
});

export default Role;
