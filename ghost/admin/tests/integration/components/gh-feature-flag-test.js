import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Service from 'ember-service';
import wait from 'ember-test-helpers/wait';

const featureStub = Service.extend({
    testFlag: true
});

describeComponent(
    'gh-feature-flag',
    'Integration: Component: gh-feature-flag',
    {
        integration: true
    },
    function() {
        let server;

        beforeEach(function () {
            this.register('service:feature', featureStub);
            this.inject.service('feature', {as: 'feature'});
        });

        it('renders properties correctly', function () {
            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);
            expect(this.$('label').attr('for')).to.equal(this.$('input[type="checkbox"]').attr('id'));
        });

        it('renders correctly when flag is set to true', function () {
            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);
            expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.true;
        });

        it('renders correctly when flag is set to false', function () {
            this.set('feature.testFlag', false);

            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);

            expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.false;
        });

        it('updates to reflect changes in flag property', function () {
            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);

            expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.true;

            this.$('label').click();

            expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.false;
        });
    }
);
