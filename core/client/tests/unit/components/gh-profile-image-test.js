/* jshint expr:true */
/* global md5 */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent(
    'gh-profile-image',
    'Unit: Component: gh-profile-image',
    {
        unit: true,
        needs: ['service:ghost-paths']
    },
    function () {
        it('renders', function () {
            // creates the component instance
            var component = this.subject();
            expect(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');
        });
        it('renders the gravatar image background if valid gravatar email is supplied', function () {
            var component = this.subject(),
                testEmail = 'test@example.com',
                size = component.get('size'),
                imageUrl = 'http://www.gravatar.com/avatar/' + md5(testEmail) + '?s=' + size + '&d=404',
                style;

            component.set('email', testEmail);
            component.set('imageBackgroundUrl', {
                value: imageUrl
            });

            this.render();

            style = 'url(' + imageUrl + ')';

            expect(component.$('#account-image').css('background-image')).to.equal(style);
        });
        it('doesn\'t render the gravatar image background if email isn\'t supplied', function () {
            var component = this.subject();

            this.render();

            expect(component.$('#account-image').length).to.equal(0);
        });
    }
);
