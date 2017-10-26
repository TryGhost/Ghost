import {describe, it} from 'mocha';
import {run} from '@ember/runloop';
import {setupModelTest} from 'ember-mocha';

describe('Unit: Model: user', function () {
    setupModelTest('user', {
        needs: [
            'model:role',
            'serializer:application',
            'serializer:user',
            'service:ajax',
            'service:config',
            'service:ghostPaths',
            'service:notifications',
            'service:session'
        ]
    });

    it('has a validation type of "user"', function () {
        let model = this.subject();

        expect(model.get('validationType')).to.equal('user');
    });

    it('isActive/isSuspended properties are correct', function () {
        let model = this.subject({
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
        let model = this.subject();

        run(() => {
            let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Author'}}});
            model.get('roles').pushObject(role);
        });
        expect(model.get('role.name')).to.equal('Author');

        run(() => {
            let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Editor'}}});
            model.set('role', role);
        });
        expect(model.get('role.name')).to.equal('Editor');
    });

    it('isAuthor property is correct', function () {
        let model = this.subject();

        run(() => {
            let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Author'}}});
            model.set('role', role);
        });
        expect(model.get('isAuthor')).to.be.ok;
        expect(model.get('isEditor')).to.not.be.ok;
        expect(model.get('isAdmin')).to.not.be.ok;
        expect(model.get('isOwner')).to.not.be.ok;
    });

    it('isEditor property is correct', function () {
        let model = this.subject();

        run(() => {
            let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Editor'}}});
            model.set('role', role);
        });
        expect(model.get('isEditor')).to.be.ok;
        expect(model.get('isAuthor')).to.not.be.ok;
        expect(model.get('isAdmin')).to.not.be.ok;
        expect(model.get('isOwner')).to.not.be.ok;
    });

    it('isAdmin property is correct', function () {
        let model = this.subject();

        run(() => {
            let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Administrator'}}});
            model.set('role', role);
        });
        expect(model.get('isAdmin')).to.be.ok;
        expect(model.get('isAuthor')).to.not.be.ok;
        expect(model.get('isEditor')).to.not.be.ok;
        expect(model.get('isOwner')).to.not.be.ok;
    });

    it('isOwner property is correct', function () {
        let model = this.subject();

        run(() => {
            let role = this.store().push({data: {id: 1, type: 'role', attributes: {name: 'Owner'}}});
            model.set('role', role);
        });
        expect(model.get('isOwner')).to.be.ok;
        expect(model.get('isAuthor')).to.not.be.ok;
        expect(model.get('isAdmin')).to.not.be.ok;
        expect(model.get('isEditor')).to.not.be.ok;
    });
});
