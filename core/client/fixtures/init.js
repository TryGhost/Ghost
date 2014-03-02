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
    response: postFixtures,
    jqXHR: {},
    textStatus: 'success'
  }
};

export default function() {
  ic.ajax.defineFixture('/ghost/api/v0.1/posts', posts());
  ic.ajax.defineFixture('/ghost/api/v0.1/posts/1', post(1));
  ic.ajax.defineFixture('/ghost/api/v0.1/posts/2', post(2));
};
