import Ember from 'ember';
import {
    describeModel,
    it
} from 'ember-mocha';

const {run} = Ember;

describeModel(
    'user',
    'Unit: Model: user',
    {
        needs: ['model:role', 'serializer:application', 'serializer:user']
    },

    function () {
        it('has a validation type of "user"', function () {
            let model = this.subject();

            expect(model.get('validationType')).to.equal('user');
        });

        it('active property is correct', function () {
            let model = this.subject({
                status: 'active'
            });

            expect(model.get('active')).to.be.ok;

            ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].forEach(function (status) {
                run(() => { model.set('status', status); });
                expect(model.get('status')).to.be.ok;
            });

            run(() => { model.set('status', 'inactive'); });
            expect(model.get('active')).to.not.be.ok;

            run(() => { model.set('status', 'invited'); });
            expect(model.get('active')).to.not.be.ok;
        });

        it('invited property is correct', function () {
            let model = this.subject({
                status: 'invited'
            });

            expect(model.get('invited')).to.be.ok;

            run(() => { model.set('status', 'invited-pending'); });
            expect(model.get('invited')).to.be.ok;

            run(() => { model.set('status', 'active'); });
            expect(model.get('invited')).to.not.be.ok;

            run(() => { model.set('status', 'inactive'); });
            expect(model.get('invited')).to.not.be.ok;
        });

        it('pending property is correct', function () {
            let model = this.subject({
                status: 'invited-pending'
            });

            expect(model.get('pending')).to.be.ok;

            run(() => { model.set('status', 'invited'); });
            expect(model.get('pending')).to.not.be.ok;

            run(() => { model.set('status', 'inactive'); });
            expect(model.get('pending')).to.not.be.ok;
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
    }
);
