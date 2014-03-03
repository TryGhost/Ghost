import postFixtures from 'ghost/fixtures/posts';

var post = function(id) {
  return {
    response: postFixtures.findBy('id', id),
    jqXHR: {},
    textStatus: 'success'
  }
};

var posts = function() {
  return {
    response: {
      "posts": postFixtures,
      "page": 1,
      "limit": 15,
      "pages": 1,
      "total": 2
    },
    jqXHR: {},
    textStatus: 'success'
  }
};


export default function() {
  ic.ajax.defineFixture('/ghost/api/v0.1/posts', posts());
  ic.ajax.defineFixture('/ghost/api/v0.1/posts/1', post(1));
  ic.ajax.defineFixture('/ghost/api/v0.1/posts/2', post(2));
};
