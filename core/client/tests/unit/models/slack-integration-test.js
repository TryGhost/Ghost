/* jshint expr:true */
import { expect } from 'chai';
import { describeModule, it } from 'ember-mocha';

describeModule(
    'model:slack-integration',
    'Unit: Model: slack-integration',
    {
        // Specify the other units that are required for this test.
        needs: []
    },
    function() {
        it('isComplete is true when url is filled', function () {
            let model = this.subject();

            model.set('url', 'test');

            expect(model.get('isComplete')).to.be.true;
        });

        it('isComplete is false when url is blank', function () {
            let model = this.subject();

            model.set('url', '');

            expect(model.get('isComplete')).to.be.false;
        });

        it('isBlank is true when url is blank', function () {
            let model = this.subject();

            model.set('url', '');

            expect(model.get('isBlank')).to.be.true;
        });

        it('isBlank is false when url is present', function () {
            let model = this.subject();

            model.set('url', 'test');

            expect(model.get('isBlank')).to.be.false;
        });

        it('isActivated returns true if model isActive', function () {
            let model = this.subject();

            model.set('isActive', true);

            expect(model.get('isActivated')).to.be.true;
        });

        it('isActivated returns false if model is not activated', function () {
            let model = this.subject();

            model.set('isActive', false);

            expect(model.get('isActivated')).to.be.false;
        });
    }
);
