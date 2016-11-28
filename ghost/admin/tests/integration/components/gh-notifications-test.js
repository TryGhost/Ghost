/* jshint expr:true */
import {expect} from 'chai';
import {describe, it} from 'mocha';
import {setupComponentTest} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Service from 'ember-service';
import {A as emberA} from 'ember-array/utils';

let notificationsStub = Service.extend({
    notifications: emberA()
});

describe('Integration: Component: gh-notifications', function () {
    setupComponentTest('gh-notifications', {
        integration: true
    });

    beforeEach(function () {
        this.register('service:notifications', notificationsStub);
        this.inject.service('notifications', {as: 'notifications'});

        this.set('notifications.notifications', [
            {message: 'First', type: 'error'},
            {message: 'Second', type: 'warn'}
        ]);
    });

    it('renders', function () {
        this.render(hbs`{{gh-notifications}}`);
        expect(this.$('.gh-notifications').length).to.equal(1);

        expect(this.$('.gh-notifications').children().length).to.equal(2);

        this.set('notifications.notifications', emberA());
        expect(this.$('.gh-notifications').children().length).to.equal(0);
    });
});
