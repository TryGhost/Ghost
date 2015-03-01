define("ghost/tests/unit/components/gh-trim-focus-input_test", 
  ["ember-mocha"],
  function(__dependency1__) {
    "use strict";
    /* jshint expr:true */
    var describeComponent = __dependency1__.describeComponent;
    var it = __dependency1__.it;

    describeComponent('gh-trim-focus-input', function () {
        it('trims value on focusOut', function () {
            var component = this.subject({
                value: 'some random stuff   '
            });

            this.render();

            component.$().focusout();
            expect(component.$().val()).to.equal('some random stuff');
        });
    });
  });