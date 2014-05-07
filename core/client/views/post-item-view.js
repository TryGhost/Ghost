import itemView from 'ghost/views/item-view';

var PostItemView = itemView.extend({
    openEditor: function () {
        this.get('controller').send('openEditor', this.get('controller.model'));  // send action to handle transition to editor route
    }.on("doubleClick")
});

export default PostItemView;
