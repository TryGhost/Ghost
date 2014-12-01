/* jshint expr:true */
import {
    describeComponent,
    it
} from 'ember-mocha';

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
