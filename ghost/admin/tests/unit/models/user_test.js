/*jshint expr:true */
import {
    describeModel,
    it
} from 'ember-mocha';

describeModel('user',
    {
        needs: ['model:role']
    },

    function () {
        it('has a validation type of "user"', function () {
            var model = this.subject();

            expect(model.get('validationType')).to.equal('user');
        });

        it('active property is correct', function () {
            var model = this.subject({
                status: 'active'
            });

            expect(model.get('active')).to.be.ok;

            ['warn-1', 'warn-2', 'warn-3', 'warn-4', 'locked'].forEach(function (status) {
                Ember.run(function () {
                    model.set('status', status);

                    expect(model.get('status')).to.be.ok;
                });
            });

            Ember.run(function () {
                model.set('status', 'inactive');

                expect(model.get('active')).to.not.be.ok;
            });

            Ember.run(function () {
                model.set('status', 'invited');

                expect(model.get('active')).to.not.be.ok;
            });
        });

        it('invited property is correct', function () {
            var model = this.subject({
                status: 'invited'
            });

            expect(model.get('invited')).to.be.ok;

            Ember.run(function () {
                model.set('status', 'invited-pending');

                expect(model.get('invited')).to.be.ok;
            });

            Ember.run(function () {
                model.set('status', 'active');

                expect(model.get('invited')).to.not.be.ok;
            });

            Ember.run(function () {
                model.set('status', 'inactive');

                expect(model.get('invited')).to.not.be.ok;
            });
        });

        it('pending property is correct', function () {
            var model = this.subject({
                status: 'invited-pending'
            });

            expect(model.get('pending')).to.be.ok;

            Ember.run(function () {
                model.set('status', 'invited');

                expect(model.get('pending')).to.not.be.ok;
            });

            Ember.run(function () {
                model.set('status', 'inactive');

                expect(model.get('pending')).to.not.be.ok;
            });
        });

        it('role property is correct', function () {
            var model,
                role;

            model = this.subject();

            Ember.run(this, function () {
                role = this.store().createRecord('role', {name: 'Author'});

                model.get('roles').pushObject(role);

                expect(model.get('role.name')).to.equal('Author');
            });

            Ember.run(this, function () {
                role = this.store().createRecord('role', {name: 'Editor'});

                model.set('role', role);

                expect(model.get('role.name')).to.equal('Editor');
            });
        });

        it('isAuthor property is correct', function () {
            var model = this.subject();

            Ember.run(this, function () {
                var role = this.store().createRecord('role', {name: 'Author'});

                model.set('role', role);

                expect(model.get('isAuthor')).to.be.ok;
                expect(model.get('isEditor')).to.not.be.ok;
                expect(model.get('isAdmin')).to.not.be.ok;
                expect(model.get('isOwner')).to.not.be.ok;
            });
        });

        it('isEditor property is correct', function () {
            var model = this.subject();

            Ember.run(this, function () {
                var role = this.store().createRecord('role', {name: 'Editor'});

                model.set('role', role);

                expect(model.get('isEditor')).to.be.ok;
                expect(model.get('isAuthor')).to.not.be.ok;
                expect(model.get('isAdmin')).to.not.be.ok;
                expect(model.get('isOwner')).to.not.be.ok;
            });
        });

        it('isAdmin property is correct', function () {
            var model = this.subject();

            Ember.run(this, function () {
                var role = this.store().createRecord('role', {name: 'Administrator'});

                model.set('role', role);

                expect(model.get('isAdmin')).to.be.ok;
                expect(model.get('isAuthor')).to.not.be.ok;
                expect(model.get('isEditor')).to.not.be.ok;
                expect(model.get('isOwner')).to.not.be.ok;
            });
        });

        it('isOwner property is correct', function () {
            var model = this.subject();

            Ember.run(this, function () {
                var role = this.store().createRecord('role', {name: 'Owner'});

                model.set('role', role);

                expect(model.get('isOwner')).to.be.ok;
                expect(model.get('isAuthor')).to.not.be.ok;
                expect(model.get('isAdmin')).to.not.be.ok;
                expect(model.get('isEditor')).to.not.be.ok;
            });
        });
    }
);
