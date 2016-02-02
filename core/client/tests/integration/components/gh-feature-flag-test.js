import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import FeatureService, {feature} from 'ghost/services/feature';
import Pretender from 'pretender';
import wait from 'ember-test-helpers/wait';

function stubSettings(server, labs) {
    server.get('/ghost/api/v0.1/settings/', function () {
        return [200, {'Content-Type': 'application/json'}, JSON.stringify({settings: [
            {
                id: '1',
                type: 'blog',
                key: 'labs',
                value: JSON.stringify(labs)
            },
            // postsPerPage is needed to satisfy the validation
            {
                id: '2',
                type: 'blog',
                key: 'postsPerPage',
                value: 1
            }
        ]})];
    });

    server.put('/ghost/api/v0.1/settings/', function (request) {
        return [200, {'Content-Type': 'application/json'}, request.requestBody];
    });
}

function addTestFlag() {
    FeatureService.reopen({
        testFlag: feature('testFlag')
    });
}

describeComponent(
    'gh-feature-flag',
    'Integration: Component: gh-feature-flag',
    {
        integration: true
    },
    function() {
        let server;

        beforeEach(function () {
            server = new Pretender();
        });

        afterEach(function () {
            server.shutdown();
        });

        it('renders properties correctly', function () {
            stubSettings(server, {testFlag: true});
            addTestFlag();

            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);
            expect(this.$('label').attr('for')).to.equal(this.$('input[type="checkbox"]').attr('id'));
        });

        it('renders correctly when flag is set to true', function () {
            stubSettings(server, {testFlag: true});
            addTestFlag();

            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);

            return wait().then(() => {
                expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.true;
            });
        });

        it('renders correctly when flag is set to false', function () {
            stubSettings(server, {testFlag: false});
            addTestFlag();

            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);

            return wait().then(() => {
                expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.false;
            });
        });

        it('updates to reflect changes in flag property', function () {
            stubSettings(server, {testFlag: true});
            addTestFlag();

            this.render(hbs`{{gh-feature-flag "testFlag"}}`);
            expect(this.$()).to.have.length(1);

            return wait().then(() => {
                expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.true;

                this.$('label').click();

                return wait();
            }).then(() => {
                expect(this.$('label input[type="checkbox"]').prop('checked')).to.be.false;
            });
        });
    }
);
