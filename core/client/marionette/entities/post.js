this.App.module("Entities", function(Entities, App, Backbone, Marionette, $, _){
  Entities.Post = Backbone.Model.extend({
    urlRoot: '/ghost/api/v0.1/posts',
    choose: function(){
      this.collection.unchoose();
      this.set({chosen: true});
    },
    unchoose: function(){
      this.set({chosen: false})
    },
    parse: function(resp) {
      if (resp.status) {
        resp.published = resp.status === 'published';
        resp.draft = resp.status === 'draft';
      }

      return resp;
    },
    // sam does not agree with brian mann here
    // brian says this belongs in a mutator (ViewModel)
    getPublishedFormatted: function(){
      return moment(this.get("published_at")).format('DD MMM YY @ HH:mm');
    }
  });

  Entities.PostsCollection = Backbone.Collection.extend({
    model: Entities.Post,
    url: '/ghost/api/v0.1/posts',
    parse: function(response, options){
      return response.posts;
    },
    chooseFirst: function(){
      this.at(0).choose();
    },
    unchoose: function(){
      _(this.where({chosen: true})).invoke("unchoose");
    },
    chooseBySlug: function(slug) {
      this.findWhere({slug: slug}).choose()
    }
  });

  var API = {
    getPosts: function(slug){
      var posts = new Entities.PostsCollection;
      posts.fetch({reset: true}).done(function(){
        slug ? posts.chooseBySlug(slug) : posts.chooseFirst();
      });
      return posts;
    }
  }

  App.reqres.setHandler("post:entities", function(slug){
    return API.getPosts(slug)
  });
});