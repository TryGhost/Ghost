import Ember from 'ember';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-trim-focus-input',
    'Unit: Component: gh-trim-focus-input',
    {
        unit: true
    },
    function () {
        it('trims value on focusOut', function () {
            let component = this.subject({
                value: 'some random stuff   '
            });

            this.render();

            component.$().focusout();
            expect(component.$().val()).to.equal('some random stuff');
        });

        it('does not have the autofocus attribute if not set to focus', function () {
            let component = this.subject({
                value: 'some text',
                focus: false
            });

            this.render();

            expect(component.$().attr('autofocus')).to.not.be.ok;
        });

        it('has the autofocus attribute if set to focus', function () {
            let component = this.subject({
                value: 'some text',
                focus: true
            });

            this.render();

            expect(component.$().attr('autofocus')).to.be.ok;
        });
    }
);
