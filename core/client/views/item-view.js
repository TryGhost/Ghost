var ItemView = Ember.View.extend({
    classNameBindings: ['active'],

    active: Ember.computed('childViews.firstObject.active', function () {
        return this.get('childViews.firstObject.active');
    })
});

export default ItemView;
