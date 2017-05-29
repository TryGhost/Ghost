/* jshint expr:true */
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Unit: Component: gh-upgrade-notification', function() {
    setupComponentTest('gh-upgrade-notification', {
        unit: true,
        needs: ['helper:gh-format-html', 'service:upgrade-notification']
    });

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
});
