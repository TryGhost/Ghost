Ember Mocha Adapter
-------------------

A mocha adapter for ember-testing.

This adapter makes async testing ember apps with mocha
easier.

It gets rid of the `done()` callback and lets
you test without worrying whether your tests
are sync or async.


### Setup

Just include the adapter.js file in your test. The Mocha Adapter will automatically be set as the default Test Adapter.

This adapter calls `mocha.setup()` for you. If you call `mocha.setup()` in your test setup code you will break this adapter.

You should setup Ember.js for testing as described in
[the documentation](http://emberjs.com/guides/testing/integration/#toc_setup).
These function calls should happen outside any Mocha callback.

To run the tests, call `mocha.run()` like this:

```javascript

Ember.$(function() {
  mocha.run();
});
```

### Example:

```javascript

describe("Adding a post", function() {

  beforeEach(function() {
    visit('posts/new');
  });

  afterEach(function() {
    App.reset();
  });

  it("should take me to a form", function() {
    find('form').should.exist;
  });

  it("should not submit with an empty title", function() {
    click('.submit');

    andThen(function() {
      find('.error').text().should.equal('Title is required.');
    });
  });

  it("should create a post on submit", function() {
    fillIn('.title', 'Test Post');
    fillIn('.body', 'This is the body');
    click('.submit');
    andThen(function() {
      find('.post').should.exist;
      find('.post-title').text().should.equal('Test Post');
    });
  });


});

```
