import itemView from 'ghost/views/item-view';

var PostItemView = itemView.extend({
    classNameBindings: ['isFeatured:featured', 'isPage:page'],

    isFeatured: Ember.computed.alias('controller.model.featured'),

    isPage: Ember.computed.alias('controller.model.page'),
    
    //Edit post on double click
    doubleClick: function () {
        this.get('controller').send('openEditor', this.get('controller.model'));
    }
    
});

export default PostItemView;
