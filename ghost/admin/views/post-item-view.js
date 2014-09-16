import itemView from 'ghost/views/item-view';

var PostItemView = itemView.extend({
    classNameBindings: ['isFeatured:featured', 'isPage:page'],

    isFeatured: Ember.computed.alias('controller.model.featured'),

    isPage: Ember.computed.alias('controller.model.page'),

    doubleClick: function () {
        this.get('controller').send('openEditor');
    },

    click: function () {
        this.get('controller').send('showPostContent');
    }

});

export default PostItemView;
