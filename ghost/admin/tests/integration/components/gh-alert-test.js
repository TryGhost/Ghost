import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupComponentTest} from 'ember-mocha';

describe('Integration: Component: gh-alert', function () {
    setupComponentTest('gh-alert', {
        integration: true
    });

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
        expect($alert.hasClass('gh-alert-blue'), 'success class isn\'t yellow').to.be.true;

        this.set('message.type', 'info');
        expect($alert.hasClass('gh-alert-blue'), 'success class isn\'t blue').to.be.true;
    });
});
