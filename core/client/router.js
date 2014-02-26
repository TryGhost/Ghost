
App.Router.map(function(){
  this.resource('posts');
  this.resource('post', {path: 'post/:id'}, function(){
    this.route('edit');
  });
});
