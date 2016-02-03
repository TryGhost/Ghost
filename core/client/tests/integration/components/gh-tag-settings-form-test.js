/* jshint expr:true */
/* jscs:disable requireTemplateStringsForConcatenation */
import { expect } from 'chai';
import {
    describeComponent,
    it
} from 'ember-mocha';
import hbs from 'htmlbars-inline-precompile';
import Ember from 'ember';
import DS from 'ember-data';

const {run} = Ember;

let configStub = Ember.Service.extend({
    blogUrl: 'http://localhost:2368'
});

let mediaQueriesStub = Ember.Service.extend({
    maxWidth600: false
});

describeComponent(
    'gh-tag-settings-form',
    'Integration: Component: gh-tag-settings-form',
    {
        integration: true
    },
    function () {
        beforeEach(function () {
            /* jscs:disable requireCamelCaseOrUpperCaseIdentifiers */
            let tag = Ember.Object.create({
                id: 1,
                name: 'Test',
                slug: 'test',
                description: 'Description.',
                metaTitle: 'Meta Title',
                metaDescription: 'Meta description',
                errors: DS.Errors.create(),
                hasValidated: []
            });
            /* jscs:enable requireCamelCaseOrUpperCaseIdentifiers */

            this.set('tag', tag);
            this.set('actions.setProperty', function (property, value) {
                // this should be overridden if a call is expected
                console.error(`setProperty called '${property}: ${value}'`);
            });

            this.register('service:config', configStub);
            this.inject.service('config', {as: 'config'});

            this.register('service:media-queries', mediaQueriesStub);
            this.inject.service('media-queries', {as: 'mediaQueries'});
        });

        it('renders', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);
            expect(this.$()).to.have.length(1);
        });

        it('has the correct title', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);
            expect(this.$('.tag-settings-pane h4').text(), 'existing tag title').to.equal('Tag Settings');

            this.set('tag.isNew', true);
            expect(this.$('.tag-settings-pane h4').text(), 'new tag title').to.equal('New Tag');
        });

        it('renders main settings', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);

            expect(this.$('.image-uploader').length, 'displays image uploader').to.equal(1);
            expect(this.$('input[name="name"]').val(), 'name field value').to.equal('Test');
            expect(this.$('input[name="slug"]').val(), 'slug field value').to.equal('test');
            expect(this.$('textarea[name="description"]').val(), 'description field value').to.equal('Description.');
            expect(this.$('input[name="metaTitle"]').val(), 'metaTitle field value').to.equal('Meta Title');
            expect(this.$('textarea[name="metaDescription"]').val(), 'metaDescription field value').to.equal('Meta description');
        });

        it('can switch between main/meta settings', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);

            expect(this.$('.tag-settings-pane').hasClass('settings-menu-pane-in'), 'main settings are displayed by default').to.be.true;
            expect(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-out-right'), 'meta settings are hidden by default').to.be.true;

            run(() => {
                this.$('.meta-data-button').click();
            });

            expect(this.$('.tag-settings-pane').hasClass('settings-menu-pane-out-left'), 'main settings are hidden after clicking Meta Data button').to.be.true;
            expect(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-in'), 'meta settings are displayed after clicking Meta Data button').to.be.true;

            run(() => {
                this.$('.back').click();
            });

            expect(this.$('.tag-settings-pane').hasClass('settings-menu-pane-in'), 'main settings are displayed after clicking "back"').to.be.true;
            expect(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-out-right'), 'meta settings are hidden after clicking "back"').to.be.true;
        });

        it('has one-way binding for properties', function () {
            this.set('actions.setProperty', function () {
                // noop
            });

            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);

            run(() => {
                this.$('input[name="name"]').val('New name');
                this.$('input[name="slug"]').val('new-slug');
                this.$('textarea[name="description"]').val('New description');
                this.$('input[name="metaTitle"]').val('New metaTitle');
                this.$('textarea[name="metaDescription"]').val('New metaDescription');
            });

            expect(this.get('tag.name'), 'tag name').to.equal('Test');
            expect(this.get('tag.slug'), 'tag slug').to.equal('test');
            expect(this.get('tag.description'), 'tag description').to.equal('Description.');
            expect(this.get('tag.metaTitle'), 'tag metaTitle').to.equal('Meta Title');
            expect(this.get('tag.metaDescription'), 'tag metaDescription').to.equal('Meta description');
        });

        it('triggers setProperty action on blur of all fields', function () {
            let expectedProperty = '';
            let expectedValue = '';

            this.set('actions.setProperty', function (property, value) {
                expect(property, 'property').to.equal(expectedProperty);
                expect(value, 'value').to.equal(expectedValue);
            });

            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);

            expectedProperty = 'name';
            expectedValue = 'new-slug';
            run(() => {
                this.$('input[name="name"]').val('New name');
            });

            expectedProperty = 'url';
            expectedValue = 'new-slug';
            run(() => {
                this.$('input[name="slug"]').val('new-slug');
            });

            expectedProperty = 'description';
            expectedValue = 'New description';
            run(() => {
                this.$('textarea[name="description"]').val('New description');
            });

            expectedProperty = 'metaTitle';
            expectedValue = 'New metaTitle';
            run(() => {
                this.$('input[name="metaTitle"]').val('New metaTitle');
            });

            expectedProperty = 'metaDescription';
            expectedValue = 'New metaDescription';
            run(() => {
                this.$('textarea[name="metaDescription"]').val('New metaDescription');
            });
        });

        it('displays error messages for validated fields', function () {
            let errors = this.get('tag.errors');
            let hasValidated = this.get('tag.hasValidated');

            errors.add('name', 'must be present');
            hasValidated.push('name');

            errors.add('slug', 'must be present');
            hasValidated.push('slug');

            errors.add('description', 'is too long');
            hasValidated.push('description');

            errors.add('metaTitle', 'is too long');
            hasValidated.push('metaTitle');

            errors.add('metaDescription', 'is too long');
            hasValidated.push('metaDescription');

            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);

            let nameFormGroup = this.$('input[name="name"]').closest('.form-group');
            expect(nameFormGroup.hasClass('error'), 'name form group has error state').to.be.true;
            expect(nameFormGroup.find('.response').length, 'name form group has error message').to.equal(1);

            let slugFormGroup = this.$('input[name="slug"]').closest('.form-group');
            expect(slugFormGroup.hasClass('error'), 'slug form group has error state').to.be.true;
            expect(slugFormGroup.find('.response').length, 'slug form group has error message').to.equal(1);

            let descriptionFormGroup = this.$('textarea[name="description"]').closest('.form-group');
            expect(descriptionFormGroup.hasClass('error'), 'description form group has error state').to.be.true;

            let metaTitleFormGroup = this.$('input[name="metaTitle"]').closest('.form-group');
            expect(metaTitleFormGroup.hasClass('error'), 'metaTitle form group has error state').to.be.true;
            expect(metaTitleFormGroup.find('.response').length, 'metaTitle form group has error message').to.equal(1);

            let metaDescriptionFormGroup = this.$('textarea[name="metaDescription"]').closest('.form-group');
            expect(metaDescriptionFormGroup.hasClass('error'), 'metaDescription form group has error state').to.be.true;
            expect(metaDescriptionFormGroup.find('.response').length, 'metaDescription form group has error message').to.equal(1);
        });

        it('displays char count for text fields', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);

            let descriptionFormGroup = this.$('textarea[name="description"]').closest('.form-group');
            expect(descriptionFormGroup.find('.word-count').text(), 'description char count').to.equal('12');

            let metaDescriptionFormGroup = this.$('textarea[name="metaDescription"]').closest('.form-group');
            expect(metaDescriptionFormGroup.find('.word-count').text(), 'description char count').to.equal('16');
        });

        it('renders SEO title preview', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);
            expect(this.$('.seo-preview-title').text(), 'displays meta title if present').to.equal('Meta Title');

            run(() => {
                this.set('tag.metaTitle', '');
            });
            expect(this.$('.seo-preview-title').text(), 'falls back to tag name without metaTitle').to.equal('Test');

            run(() => {
                this.set('tag.name', (new Array(151).join('x')));
            });
            let expectedLength = 70 + '…'.length;
            expect(this.$('.seo-preview-title').text().length, 'cuts title to max 70 chars').to.equal(expectedLength);
        });

        it('renders SEO URL preview', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);
            expect(this.$('.seo-preview-link').text(), 'adds url and tag prefix').to.equal('http://localhost:2368/tag/test/');

            run(() => {
                this.set('tag.slug', (new Array(151).join('x')));
            });
            let expectedLength = 70 + '…'.length;
            expect(this.$('.seo-preview-link').text().length, 'cuts slug to max 70 chars').to.equal(expectedLength);
        });

        it('renders SEO description preview', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);
            expect(this.$('.seo-preview-description').text(), 'displays meta description if present').to.equal('Meta description');

            run(() => {
                this.set('tag.metaDescription', '');
            });
            expect(this.$('.seo-preview-description').text(), 'falls back to tag description without metaDescription').to.equal('Description.');

            run(() => {
                this.set('tag.description', (new Array(200).join('x')));
            });
            let expectedLength = 156 + '…'.length;
            expect(this.$('.seo-preview-description').text().length, 'cuts description to max 156 chars').to.equal(expectedLength);
        });

        it('resets if a new tag is received', function () {
            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);
            run(() => {
                this.$('.meta-data-button').click();
            });
            expect(this.$('.tag-meta-settings-pane').hasClass('settings-menu-pane-in'), 'meta data pane is shown').to.be.true;

            run(() => {
                this.set('tag', Ember.Object.create({id: '2'}));
            });
            expect(this.$('.tag-settings-pane').hasClass('settings-menu-pane-in'), 'resets to main settings').to.be.true;
        });

        it('triggers delete tag modal on delete click', function (done) {
            // TODO: will time out if this isn't hit, there's probably a better
            // way of testing this
            this.set('actions.openModal', () => {
                done();
            });

            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty') showDeleteTagModal=(action 'openModal')}}
            `);

            run(() => {
                this.$('.tag-delete-button').click();
            });
        });

        it('shows settings.tags arrow link on mobile', function () {
            this.set('mediaQueries.maxWidth600', true);

            this.render(hbs`
                {{gh-tag-settings-form tag=tag setProperty=(action 'setProperty')}}
            `);

            expect(this.$('.tag-settings-pane .settings-menu-header .settings-menu-header-action').length, 'settings.tags link is shown').to.equal(1);
        });
    }
);
