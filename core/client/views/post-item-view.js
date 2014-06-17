import itemView from 'ghost/views/item-view';

var PostItemView = itemView.extend({
    classNameBindings: ['isFeatured:featured', 'isPage:page'],

    isFeatured: Ember.computed.alias('controller.model.featured'),

    isPage: Ember.computed.alias('controller.model.page'),

    // WIP for #2308
    /*
    openEditor: function () {
        this.get('controller').send('openEditor', this.get('controller.model'));  // send action to handle transition to editor route
    }.on('doubleClick')
    */
});

export default PostItemView;
