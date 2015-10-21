/* jshint expr:true */
import { expect } from 'chai';
import {
  describeComponent,
  it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'gh-alert',
    'Integration: Component: gh-alert',
    {
        integration: true
    },
    function () {
        it('renders', function () {
            this.set('message', {message: 'Test message', type: 'success'});

            this.render(hbs`{{gh-alert message=message}}`);

            expect(this.$('article.gh-alert')).to.have.length(1);
            let $alert = this.$('.gh-alert');

            expect($alert.text()).to.match(/Test message/);
        });

        it('maps message types to CSS classes', function () {
            this.set('message', {message: 'Test message', type: 'success'});

            this.render(hbs`{{gh-alert message=message}}`);
            let $alert = this.$('.gh-alert');

            this.set('message.type', 'success');
            expect($alert.hasClass('gh-alert-green'), 'success class isn\'t green').to.be.true;

            this.set('message.type', 'error');
            expect($alert.hasClass('gh-alert-red'), 'success class isn\'t red').to.be.true;

            this.set('message.type', 'warn');
            expect($alert.hasClass('gh-alert-yellow'), 'success class isn\'t yellow').to.be.true;

            this.set('message.type', 'info');
            expect($alert.hasClass('gh-alert-blue'), 'success class isn\'t blue').to.be.true;
        });
    }
);
