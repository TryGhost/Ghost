// TODO: remove usage of Ember Data's private `Errors` class when refactoring validations
// eslint-disable-next-line
import DS from 'ember-data';
import EmberObject from '@ember/object';
import Service from '@ember/service';
import hbs from 'htmlbars-inline-precompile';
import {blur, click, fillIn, find, findAll, render} from '@ember/test-helpers';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {setupRenderingTest} from 'ember-mocha';

const {Errors} = DS;

let configStub = Service.extend({
    blogUrl: 'http://localhost:2368'
});

let mediaQueriesStub = Service.extend({
    maxWidth600: false
});

describe.skip('Integration: Component: gh-tag-settings-form', function () {
    setupRenderingTest();

    beforeEach(function () {
        /* eslint-disable camelcase */
        let tag = EmberObject.create({
            id: 1,
            name: 'Test',
            slug: 'test',
            description: 'Description.',
            metaTitle: 'Meta Title',
            metaDescription: 'Meta description',
            errors: Errors.create(),
            hasValidated: []
        });
        /* eslint-enable camelcase */

        this.set('tag', tag);
        this.set('setProperty', function (property, value) {
            // this should be overridden if a call is expected
            // eslint-disable-next-line no-console
            console.error(`setProperty called '${property}: ${value}'`);
        });

        this.owner.register('service:config', configStub);
        this.owner.register('service:media-queries', mediaQueriesStub);
    });

    it('has the correct title', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);
        expect(find('.tag-settings-pane h4').textContent, 'existing tag title').to.equal('Tag settings');

        this.set('tag.isNew', true);
        expect(find('.tag-settings-pane h4').textContent, 'new tag title').to.equal('New tag');
    });

    it('renders main settings', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);

        expect(findAll('.gh-image-uploader').length, 'displays image uploader').to.equal(1);
        expect(find('input[name="name"]').value, 'name field value').to.equal('Test');
        expect(find('input[name="slug"]').value, 'slug field value').to.equal('test');
        expect(find('textarea[name="description"]').value, 'description field value').to.equal('Description.');
        expect(find('input[name="metaTitle"]').value, 'metaTitle field value').to.equal('Meta Title');
        expect(find('textarea[name="metaDescription"]').value, 'metaDescription field value').to.equal('Meta description');
    });

    it('can switch between main/meta settings', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);

        expect(find('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'main settings are displayed by default').to.be.true;
        expect(find('.tag-meta-settings-pane').classList.contains('settings-menu-pane-out-right'), 'meta settings are hidden by default').to.be.true;

        await click('.meta-data-button');

        expect(find('.tag-settings-pane').classList.contains('settings-menu-pane-out-left'), 'main settings are hidden after clicking Meta Data button').to.be.true;
        expect(find('.tag-meta-settings-pane').classList.contains('settings-menu-pane-in'), 'meta settings are displayed after clicking Meta Data button').to.be.true;

        await click('.back');

        expect(find('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'main settings are displayed after clicking "back"').to.be.true;
        expect(find('.tag-meta-settings-pane').classList.contains('settings-menu-pane-out-right'), 'meta settings are hidden after clicking "back"').to.be.true;
    });

    it('has one-way binding for properties', async function () {
        this.set('setProperty', function () {
            // noop
        });

        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);

        await fillIn('input[name="name"]', 'New name');
        await fillIn('input[name="slug"]', 'new-slug');
        await fillIn('textarea[name="description"]', 'New description');
        await fillIn('input[name="metaTitle"]', 'New metaTitle');
        await fillIn('textarea[name="metaDescription"]', 'New metaDescription');

        expect(this.get('tag.name'), 'tag name').to.equal('Test');
        expect(this.get('tag.slug'), 'tag slug').to.equal('test');
        expect(this.get('tag.description'), 'tag description').to.equal('Description.');
        expect(this.get('tag.metaTitle'), 'tag metaTitle').to.equal('Meta Title');
        expect(this.get('tag.metaDescription'), 'tag metaDescription').to.equal('Meta description');
    });

    it('triggers setProperty action on blur of all fields', async function () {
        let lastSeenProperty = '';
        let lastSeenValue = '';

        this.set('setProperty', function (property, value) {
            lastSeenProperty = property;
            lastSeenValue = value;
        });

        let testSetProperty = async (selector, expectedProperty, expectedValue) => {
            await click(selector);
            await fillIn(selector, expectedValue);
            await blur(selector);
            expect(lastSeenProperty, 'property').to.equal(expectedProperty);
            expect(lastSeenValue, 'value').to.equal(expectedValue);
        };

        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);

        await testSetProperty('input[name="name"]', 'name', 'New name');
        await testSetProperty('input[name="slug"]', 'slug', 'new-slug');
        await testSetProperty('textarea[name="description"]', 'description', 'New description');
        await testSetProperty('input[name="metaTitle"]', 'metaTitle', 'New metaTitle');
        await testSetProperty('textarea[name="metaDescription"]', 'metaDescription', 'New metaDescription');
    });

    it('displays error messages for validated fields', async function () {
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

        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);

        let nameFormGroup = find('input[name="name"]').closest('.form-group');
        expect(nameFormGroup, 'name form group has error state').to.have.class('error');
        expect(nameFormGroup.querySelector('.response'), 'name form group has error message').to.exist;

        let slugFormGroup = find('input[name="slug"]').closest('.form-group');
        expect(slugFormGroup, 'slug form group has error state').to.have.class('error');
        expect(slugFormGroup.querySelector('.response'), 'slug form group has error message').to.exist;

        let descriptionFormGroup = find('textarea[name="description"]').closest('.form-group');
        expect(descriptionFormGroup, 'description form group has error state').to.have.class('error');

        let metaTitleFormGroup = find('input[name="metaTitle"]').closest('.form-group');
        expect(metaTitleFormGroup, 'metaTitle form group has error state').to.have.class('error');
        expect(metaTitleFormGroup.querySelector('.response'), 'metaTitle form group has error message').to.exist;

        let metaDescriptionFormGroup = find('textarea[name="metaDescription"]').closest('.form-group');
        expect(metaDescriptionFormGroup, 'metaDescription form group has error state').to.have.class('error');
        expect(metaDescriptionFormGroup.querySelector('.response'), 'metaDescription form group has error message').to.exist;
    });

    it('displays char count for text fields', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);

        let descriptionFormGroup = find('textarea[name="description"]').closest('.form-group');
        expect(descriptionFormGroup.querySelector('.word-count'), 'description char count').to.have.trimmed.text('12');

        let metaDescriptionFormGroup = find('textarea[name="metaDescription"]').closest('.form-group');
        expect(metaDescriptionFormGroup.querySelector('.word-count'), 'description char count').to.have.trimmed.text('16');
    });

    it('renders SEO title preview', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);
        expect(find('.seo-preview-title').textContent, 'displays meta title if present').to.equal('Meta Title');

        this.set('tag.metaTitle', '');
        expect(find('.seo-preview-title').textContent, 'falls back to tag name without metaTitle').to.equal('Test');

        this.set('tag.name', (new Array(151).join('x')));
        let expectedLength = 70 + '…'.length;
        expect(find('.seo-preview-title').textContent.length, 'cuts title to max 70 chars').to.equal(expectedLength);
    });

    it('renders SEO URL preview', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);
        expect(find('.seo-preview-link').textContent, 'adds url and tag prefix').to.equal('http://localhost:2368/tag/test/');

        this.set('tag.slug', (new Array(151).join('x')));
        let expectedLength = 70 + '…'.length;
        expect(find('.seo-preview-link').textContent.length, 'cuts slug to max 70 chars').to.equal(expectedLength);
    });

    it('renders SEO description preview', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);
        expect(find('.seo-preview-description').textContent, 'displays meta description if present').to.equal('Meta description');

        this.set('tag.metaDescription', '');
        expect(find('.seo-preview-description').textContent, 'falls back to tag description without metaDescription').to.equal('Description.');

        this.set('tag.description', (new Array(500).join('x')));
        let expectedLength = 156 + '…'.length;
        expect(find('.seo-preview-description').textContent.length, 'cuts description to max 156 chars').to.equal(expectedLength);
    });

    it('resets if a new tag is received', async function () {
        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);
        await click('.meta-data-button');
        expect(find('.tag-meta-settings-pane').classList.contains('settings-menu-pane-in'), 'meta data pane is shown').to.be.true;

        this.set('tag', EmberObject.create({id: '2'}));
        expect(find('.tag-settings-pane').classList.contains('settings-menu-pane-in'), 'resets to main settings').to.be.true;
    });

    it('triggers delete tag modal on delete click', async function () {
        let openModalFired = false;

        this.set('openModal', () => {
            openModalFired = true;
        });

        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty) showDeleteTagModal=(action openModal)}}
        `);
        await click('.settings-menu-delete-button');

        expect(openModalFired).to.be.true;
    });

    it('shows tags arrow link on mobile', async function () {
        let mediaQueries = this.owner.lookup('service:media-queries');
        mediaQueries.set('maxWidth600', true);

        await render(hbs`
            {{gh-tag-settings-form tag=tag setProperty=(action setProperty)}}
        `);

        expect(findAll('.tag-settings-pane .settings-menu-header .settings-menu-header-action').length, 'tags link is shown').to.equal(1);
    });
});
