import {DesignSection} from '@/admin-pages';
import {EGRESS_MOCK_RESPONSE_HEADER} from '@/helpers/environment/constants';
import {expect, test} from '@/helpers/playwright';
import type {Page} from '@playwright/test';

const testImage = 'data:image/gif;base64,R0lGODlhAQABAAAAACw=';
const unsplashPhotos = [{
    id: 'test-unsplash-photo',
    slug: 'test-unsplash-photo',
    created_at: '2026-06-22T00:00:00Z',
    updated_at: '2026-06-22T00:00:00Z',
    promoted_at: null,
    width: 1200,
    height: 800,
    color: '#f0f0f0',
    blur_hash: 'LKO2?U%2Tw=w]~RBVZRi};RPxuwH',
    description: null,
    alt_description: 'A mocked Unsplash test image',
    breadcrumbs: [],
    urls: {
        raw: testImage,
        full: testImage,
        regular: testImage,
        small: testImage,
        thumb: testImage
    },
    links: {
        self: 'https://api.unsplash.com/photos/test-unsplash-photo',
        html: 'https://unsplash.com/photos/test-unsplash-photo',
        download: 'https://unsplash.com/photos/test-unsplash-photo/download',
        download_location: 'https://api.unsplash.com/photos/test-unsplash-photo/download'
    },
    likes: 1,
    liked_by_user: false,
    current_user_collections: [],
    sponsorship: null,
    topic_submissions: {},
    user: {
        id: 'test-user',
        updated_at: '2026-06-22T00:00:00Z',
        username: 'testuser',
        name: 'Test User',
        first_name: 'Test',
        last_name: 'User',
        twitter_username: null,
        portfolio_url: null,
        bio: null,
        location: null,
        links: {
            self: 'https://api.unsplash.com/users/testuser',
            html: 'https://unsplash.com/@testuser',
            photos: 'https://api.unsplash.com/users/testuser/photos',
            likes: 'https://api.unsplash.com/users/testuser/likes',
            portfolio: 'https://api.unsplash.com/users/testuser/portfolio',
            following: 'https://api.unsplash.com/users/testuser/following',
            followers: 'https://api.unsplash.com/users/testuser/followers'
        },
        profile_image: {
            small: testImage,
            medium: testImage,
            large: testImage
        },
        instagram_username: null,
        total_collections: 0,
        total_likes: 0,
        total_photos: 1,
        accepted_tos: true,
        for_hire: false,
        social: {
            instagram_username: null,
            portfolio_url: null,
            twitter_username: null,
            paypal_email: null
        }
    }
}];

async function mockUnsplashApi(page: Page) {
    await page.route('https://api.unsplash.com/**', async (route) => {
        const url = new URL(route.request().url());
        let body: unknown;

        if (url.pathname === '/photos') {
            body = unsplashPhotos;
        } else if (url.pathname === '/search/photos') {
            body = {results: unsplashPhotos};
        } else if (url.pathname.endsWith('/download')) {
            body = {url: testImage};
        } else {
            await route.abort();
            return;
        }

        await route.fulfill({
            body: JSON.stringify(body),
            contentType: 'application/json',
            headers: {
                [EGRESS_MOCK_RESPONSE_HEADER]: '1'
            }
        });
    });
}

test.describe('Ghost Admin - Design & Branding', () => {
    test.describe('Unsplash Selector', () => {
        test('unsplash selector loads photos', async ({page}) => {
            const design = new DesignSection(page);

            await mockUnsplashApi(page);
            await design.goto();
            await design.openDesignModal();
            await design.deleteCoverImage();
            await design.openUnsplashSelector();

            await expect(design.unsplashPhotos.first()).toBeVisible({timeout: 10000});
        });
    });
});
