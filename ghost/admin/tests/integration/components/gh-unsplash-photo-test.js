import hbs from 'htmlbars-inline-precompile';
import {describe, it} from 'mocha';
import {expect} from 'chai';
import {find, render} from '@ember/test-helpers';
import {setupRenderingTest} from 'ember-mocha';

describe('Integration: Component: gh-unsplash-photo', function () {
    setupRenderingTest();

    beforeEach(function () {
        // NOTE: images.unsplash.com replaced with example.com to ensure we aren't
        // loading lots of images during tests and we get an immediate 404
        this.set('photo', {
            id: 'OYFHT4X5isg',
            created_at: '2017-08-09T00:20:42-04:00',
            updated_at: '2017-08-11T08:27:42-04:00',
            width: 5184,
            height: 3456,
            color: '#A8A99B',
            likes: 58,
            liked_by_user: false,
            description: null,
            user: {
                id: 'cEpP9pR9Q7E',
                updated_at: '2017-08-11T08:27:42-04:00',
                username: 'danotis',
                name: 'Dan Otis',
                first_name: 'Dan',
                last_name: 'Otis',
                twitter_username: 'danotis',
                portfolio_url: 'http://dan.exposure.co',
                bio: 'Senior Visual Designer at Huge ',
                location: 'San Jose, CA',
                total_likes: 0,
                total_photos: 8,
                total_collections: 0,
                profile_image: {
                    small: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=32&w=32&s=37f67120fc464d7d920ff23c84963b38',
                    medium: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=64&w=64&s=0a4f8a583caec826ac6b1ca80161fa43',
                    large: 'https://example.com/profile-fb-1502251227-8fe7a0522137.jpg?ixlib=rb-0.3.5&q=80&fm=jpg&crop=faces&cs=tinysrgb&fit=crop&h=128&w=128&s=b3aa4206e5d87f3eaa7bbe9180ebcd2b'
                },
                links: {
                    self: 'https://api.unsplash.com/users/danotis',
                    html: 'https://unsplash.com/@danotis',
                    photos: 'https://api.unsplash.com/users/danotis/photos',
                    likes: 'https://api.unsplash.com/users/danotis/likes',
                    portfolio: 'https://api.unsplash.com/users/danotis/portfolio',
                    following: 'https://api.unsplash.com/users/danotis/following',
                    followers: 'https://api.unsplash.com/users/danotis/followers'
                }
            },
            current_user_collections: [],
            urls: {
                raw: 'https://example.com/photo-1502252430442-aac78f397426',
                full: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=85&fm=jpg&crop=entropy&cs=srgb&s=20f86c2f7bbb019122498a45d8260ee9',
                regular: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=1080&fit=max&s=181760db8b7a61fa60a35277d7eb434e',
                small: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=400&fit=max&s=1e2265597b59e874a1a002b4c3fd961c',
                thumb: 'https://example.com/photo-1502252430442-aac78f397426?ixlib=rb-0.3.5&q=80&fm=jpg&crop=entropy&cs=tinysrgb&w=200&fit=max&s=57c86b0692bea92a282b9ab0dbfdacf4'
            },
            categories: [],
            links: {
                self: 'https://api.unsplash.com/photos/OYFHT4X5isg',
                html: 'https://unsplash.com/photos/OYFHT4X5isg',
                download: 'https://unsplash.com/photos/OYFHT4X5isg/download',
                download_location: 'https://api.unsplash.com/photos/OYFHT4X5isg/download'
            },
            ratio: 0.6666666666666666
        });
    });

    it('sets background-color style', async function () {
        await render(hbs`{{gh-unsplash-photo photo=photo}}`);

        expect(
            find('[data-test-unsplash-photo-container]').attributes.style.value
        ).to.have.string('background-color: #A8A99B');
    });

    it('sets padding-bottom style', async function () {
        await render(hbs`{{gh-unsplash-photo photo=photo}}`);

        // don't check full padding-bottom value as it will likely vary across
        // browsers
        expect(
            find('[data-test-unsplash-photo-container]').attributes.style.value
        ).to.have.string('padding-bottom: 66.66');
    });

    it('uses correct image size url', async function () {
        await render(hbs`{{gh-unsplash-photo photo=photo}}`);

        expect(
            find('[data-test-unsplash-photo-image]').attributes.src.value
        ).to.have.string('&w=1200');
    });

    it('calculates image width/height', async function () {
        await render(hbs`{{gh-unsplash-photo photo=photo}}`);

        expect(
            find('[data-test-unsplash-photo-image]').attributes.width.value
        ).to.equal('1200');

        expect(
            find('[data-test-unsplash-photo-image]').attributes.height.value
        ).to.equal('800');
    });

    it('triggers insert action');
    it('triggers zoom action');

    describe('zoomed', function () {
        it('omits padding-bottom style');
        it('triggers insert action');
        it('triggers zoom action');
    });
});
