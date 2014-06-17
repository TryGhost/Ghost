import itemView from 'ghost/views/item-view';

var PostItemView = itemView.extend({
    classNameBindings: ['isFeatured', 'isPage'],

    isFeatured: function () {
        if (this.get('controller.model.featured')) {
            return 'featured';
        }
    }.property('controller.model.featured'),

    isPage: function () {
        if (this.get('controller.model.page')) {
            return 'page';
        }
    }.property('controller.model.page'),

    openEditor: function () {
        this.get('controller').send('openEditor', this.get('controller.model'));  // send action to handle transition to editor route
    }.on('doubleClick')
});

export default PostItemView;
