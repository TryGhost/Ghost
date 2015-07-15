var helpers = require('./helpers');

function store(token, context) {
  context.output.push(typeof token == 'string' ? token : token[0]);
}

function context() {
  return {
    output: [],
    store: store
  };
}

function all(tokens) {
  var fakeContext = context();
  helpers.all(tokens, fakeContext);
  return fakeContext.output.join('');
}

function body(tokens) {
  var fakeContext = context();
  helpers.body(tokens, fakeContext);
  return fakeContext.output.join('');
}

function property(tokens, position) {
  var fakeContext = context();
  helpers.property(tokens, position, true, fakeContext);
  return fakeContext.output.join('');
}

function selectors(tokens) {
  var fakeContext = context();
  helpers.selectors(tokens, fakeContext);
  return fakeContext.output.join('');
}

function value(tokens, position) {
  var fakeContext = context();
  helpers.value(tokens, position, true, fakeContext);
  return fakeContext.output.join('');
}

module.exports = {
  all: all,
  body: body,
  property: property,
  selectors: selectors,
  value: value
};
