import hbs from 'htmlbars-inline-precompile';
import mockThemes from '../../../mirage/config/themes';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';
import {startMirage} from 'ghost-admin/initializers/ember-cli-mirage';

describe('Integration: Component: gh-psm-template-select', function () {
    setupRenderingTest();

    let server;

    beforeEach(function () {
        server = startMirage();

        server.create('theme', {
            active: true,
            name: 'example-theme',
            package: {
                name: 'Example Theme',
                version: '0.1'
            },
            templates: [
                {
                    filename: 'custom-news-bulletin.hbs',
                    name: 'News Bulletin',
                    for: ['post', 'page'],
                    slug: null
                },
                {
                    filename: 'custom-big-images.hbs',
                    name: 'Big Images',
                    for: ['post', 'page'],
                    slug: null
                },
                {
                    filename: 'post-one.hbs',
                    name: 'One',
                    for: ['post'],
                    slug: 'one'
                },
                {
                    filename: 'page-about.hbs',
                    name: 'About',
                    for: ['page'],
                    slug: 'about'
                }
            ]
        });

        mockThemes(server);
    });

    afterEach(function () {
        server.shutdown();
    });

    it('disables template selector if slug matches post template', async function () {
        this.set('post', {
            slug: 'one',
            constructor: {
                modelName: 'post'
            }
        });

        await render(hbs`{{gh-psm-template-select post=post}}`);

        expect(find('select').disabled, 'select is disabled').to.be.true;
        expect(find('p')).to.contain.text('post-one.hbs');
    });

    it('disables template selector if slug matches page template', async function () {
        this.set('post', {
            slug: 'about',
            constructor: {
                modelName: 'page'
            }
        });

        await render(hbs`{{gh-psm-template-select post=post}}`);

        expect(find('select').disabled, 'select is disabled').to.be.true;
        expect(find('p')).to.contain.text('page-about.hbs');
    });
});
