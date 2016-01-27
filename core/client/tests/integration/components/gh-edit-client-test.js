/* jshint expr:true */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';

describeComponent(
    'gh-client-edit',
    'Integration: GhClientEditComponent',
    {
        integration: true
    },
    function() {
        it('should display errors when saving fails', function() {

            let actionCalled = false;
            this.on('saveClient', function(){
                actionCalled = true;
                return Ember.RSVP.reject('Error occured');
            });

            this.render(hbs`
                {{gh-edit-client
                    isEditing=true
                    name='Foo'
                    status='enabled'
                    description='My connection'
                    secret='xoxo'
                    logo='foo.png'
                    redirection_uri='foo'
                    saveClient=(action "saveClient")
                }}
            `);

            this.$('[data-test-selector="save-btn"]').click();

            expect(actionCalled).to.be.true;
            expect(this.$('.form-error').text()).to.equal('Error occured');

        });

    it('should send values to action handler', function() {

        let actionCalled = false;
        this.on('saveClient', function(values){
            actionCalled = true;
            expect(values).to.deep.equal({
                name: 'Foo',
                description: 'My connection',
                redirection_uri: 'foo'
            });
        });

        this.render(hbs`
            {{gh-edit-client
                isEditing=true
                name='Foo'
                status='enabled'
                description='My connection'
                secret='xoxo'
                logo='foo.png'
                redirection_uri='foo'
                saveClient=(action "saveClient")
            }}
        `);

        this.$('[data-test-selector="save-btn"]').click();

        expect(actionCalled).to.be.true;

    });

    it('can refresh a client secret', function() {

        let actionCalled = false;
        this.on('refreshSecret', function(){
            actionCalled = true;
            return Ember.RSVP.reject('Could not refresh client secret');
        });

        this.render(hbs`
            {{gh-edit-client
                isEditing=true
                name='Foo'
                status='enabled'
                description='My connection'
                secret='xoxo'
                logo='foo.png'
                redirection_uri='foo'
                refreshSecret=(action "refreshSecret")
            }}
        `);

        this.$('button:contains(Refresh Token)').click();

        expect(actionCalled).to.be.true;
        expect(this.$('.form-error').text()).to.equal('Could not refresh client secret');

    });


    // write integration test for change status that uses closure action
    // and it shows that when error occurs while trying to save connection
    // the error displays on the form

    }
);
