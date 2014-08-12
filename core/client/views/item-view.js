var ItemView = Ember.View.extend({
    classNameBindings: ['active'],

    active: function () {
        return this.get('childViews.firstObject.active');
    }.property('childViews.firstObject.active')
});

export default ItemView;
