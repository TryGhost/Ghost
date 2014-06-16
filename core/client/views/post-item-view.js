import itemView from 'ghost/views/item-view';

var PostItemView = itemView.extend({
    classNameBindings: ['isFeatured'],

    isFeatured: function () {
        if (this.get('controller.model.featured')) {
            return 'featured';
        }
    }.property('controller.model.featured'),

    openEditor: function () {
        this.get('controller').send('openEditor', this.get('controller.model'));  // send action to handle transition to editor route
    }.on('doubleClick')
});

export default PostItemView;
