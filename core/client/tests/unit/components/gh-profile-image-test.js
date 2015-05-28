/* jshint expr:true */
/* global md5 */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';

describeComponent('gh-profile-image', 'GhProfileImageComponent', {
        needs: ['service:ghost-paths']
    }, function () {
        it('renders', function () {
            // creates the component instance
            var component = this.subject();
            expect(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');
        });
        it('renders the gravatar image background if email is supplied', function () {
            var component = this.subject(),
                testEmail = 'test@example.com',
                style, size;

            component.set('email', testEmail);
            this.render();

            size = component.get('size');

            style = 'url(http://www.gravatar.com/avatar/' + md5(testEmail) + '?s=' + size + '&d=blank)';

            expect(component.$('#account-image').css('background-image')).to.equal(style);
        });
        it('doesn\'t render the gravatar image background if email isn\'t supplied', function () {
            var component = this.subject();

            this.render();

            expect(component.$('#account-image').length).to.equal(0);
        });
    }
);
