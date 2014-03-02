import itemView from 'ghost/views/item-view';

export default itemView.extend({
  openEditor: function() {
    this.get('controller').send('openEditor', this.get('post'));  // send action to handle transition to editor route
  }.on("doubleClick")
});