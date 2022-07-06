import {describe, it} from 'mocha';
import {expect} from 'chai';
import {run} from '@ember/runloop';
import {setupTest} from 'ember-mocha';

describe('Unit: Model: user', function () {
    setupTest();

    let store;

    beforeEach(function () {
        store = this.owner.lookup('service:store');
    });

    it('has a validation type of "user"', function () {
        let model = store.createRecord('user');

        expect(model.get('validationType')).to.equal('user');
    });

    it('isActive/isSuspended properties are correct', function () {
        let model = store.createRecord('user', {
            status: 'active'
        });

        expect(model.get('isActive')).to.be.ok;
        expect(model.get('isSuspended')).to.not.be.ok;

        ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].forEach(function (status) {
            run(() => {
                model.set('status', status);
            });
            expect(model.get('isActive')).to.be.ok;
            expect(model.get('isSuspended')).to.not.be.ok;
        });

        run(() => {
            model.set('status', 'inactive');
        });
        expect(model.get('isSuspended')).to.be.ok;
        expect(model.get('isActive')).to.not.be.ok;
    });

    it('role property is correct', function () {
        let model = store.createRecord('user');

        run(() => {
            let role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Author'}}});
            model.get('roles').pushObject(role);
        });
        expect(model.get('role.name')).to.equal('Author');

        run(() => {
            let role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Editor'}}});
            model.set('role', role);
        });
        expect(model.get('role.name')).to.equal('Editor');
    });

    it('isContributor property is correct', function () {
        let model = store.createRecord('user');

        run(() => {
            let role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Contributor'}}});
            model.set('role', role);
        });
        expect(model.get('isContributor')).to.be.ok;
        expect(model.get('isAuthorOrContributor')).to.be.ok;
        expect(model.get('isAuthor')).to.not.be.ok;
        expect(model.get('isEditor')).to.not.be.ok;
        expect(model.get('isAdminOnly')).to.not.be.ok;
        expect(model.get('isOwnerOnly')).to.not.be.ok;
    });

    it('isAuthor property is correct', function () {
        let model = store.createRecord('user');

        run(() => {
            let role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Author'}}});
            model.set('role', role);
        });
        expect(model.get('isAuthor')).to.be.ok;
        expect(model.get('isContributor')).to.not.be.ok;
        expect(model.get('isAuthorOrContributor')).to.be.ok;
        expect(model.get('isEditor')).to.not.be.ok;
        expect(model.get('isAdminOnly')).to.not.be.ok;
        expect(model.get('isOwnerOnly')).to.not.be.ok;
    });

    it('isEditor property is correct', function () {
        let model = store.createRecord('user');

        run(() => {
            let role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Editor'}}});
            model.set('role', role);
        });
        expect(model.get('isEditor')).to.be.ok;
        expect(model.get('isAuthor')).to.not.be.ok;
        expect(model.get('isContributor')).to.not.be.ok;
        expect(model.get('isAuthorOrContributor')).to.not.be.ok;
        expect(model.get('isAdminOnly')).to.not.be.ok;
        expect(model.get('isOwnerOnly')).to.not.be.ok;
    });

    it('isAdminOnly property is correct', function () {
        let model = store.createRecord('user');

        run(() => {
            let role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Administrator'}}});
            model.set('role', role);
        });
        expect(model.get('isAdminOnly')).to.be.ok;
        expect(model.get('isAuthor')).to.not.be.ok;
        expect(model.get('isContributor')).to.not.be.ok;
        expect(model.get('isAuthorOrContributor')).to.not.be.ok;
        expect(model.get('isEditor')).to.not.be.ok;
        expect(model.get('isOwnerOnly')).to.not.be.ok;
    });

    it('isOwnerOnly property is correct', function () {
        let model = store.createRecord('user');

        run(() => {
            let role = store.push({data: {id: 1, type: 'role', attributes: {name: 'Owner'}}});
            model.set('role', role);
        });
        expect(model.get('isOwnerOnly')).to.be.ok;
        expect(model.get('isAuthor')).to.not.be.ok;
        expect(model.get('isContributor')).to.not.be.ok;
        expect(model.get('isAuthorOrContributor')).to.not.be.ok;
        expect(model.get('isAdminOnly')).to.not.be.ok;
        expect(model.get('isEditor')).to.not.be.ok;
    });
});
