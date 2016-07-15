/* jshint expr:true */
import {expect} from 'chai';
import {
    describeComponent,
    it
    }
from 'ember-mocha';

describeComponent(
    'gh-upgrade-notification',
    'GhUpgradeNotificationComponent',
    {
        needs: ['helper:gh-format-html']
    },
    function() {
        beforeEach(function() {
            let upgradeMessage = {'content': 'Ghost 10.02.91 is available! Hot Damn. <a href="http://support.ghost.org/how-to-upgrade/" target="_blank">Click here</a> to upgrade.'};
            this.subject().set('upgradeNotification', upgradeMessage);
        });

        it('renders', function() {
            // creates the component instance
            let component = this.subject();
            expect(component._state).to.equal('preRender');

            // renders the component on the page
            this.render();
            expect(component._state).to.equal('inDOM');

            expect(this.$().prop('tagName')).to.equal('SECTION');
            expect(this.$().hasClass('gh-upgrade-notification')).to.be.true;
            // caja tools sanitize target='_blank' attribute
            expect(this.$().html()).to.contain('Hot Damn. <a href="http://support.ghost.org/how-to-upgrade/">Click here</a>');
        });
    }
);
