import UnsplashService from '../../src/utils/services/unsplash';
import {describe, it} from 'vitest';
import {fetch} from 'cross-fetch';
global.fetch = fetch; // polyfill to make fetch work in node

describe('Unsplash Utility', function () {
    const API_VERSION = 'v1';
    const API_TOKEN = '8672af113b0a8573edae3aa3713886265d9bb741d707f6c01a486cde8c278980';

    const defaultHeaders = {
        Authorization: `Client-ID ${API_TOKEN}`,
        'Accept-Version': API_VERSION,
        'Content-Type': 'application/json',
        'App-Pragma': 'no-cache',
        'X-Unsplash-Cache': true
    };

    const unsplash = new UnsplashService({HEADERS: defaultHeaders});

    it('should have a default API_URL', function () {
        expect(unsplash.API_URL).toBe('https://api.unsplash.com');
    });

    it('initially loads 30 photos', async function () {
        await unsplash.loadNew();
        const photos = unsplash.getPhotos();
        expect(photos.length).toBe(30);
    });

    it('appends ratio to each photo', async function () {
        await unsplash.loadNew();
        const photos = unsplash.getPhotos();
        expect(photos[0].ratio).toBeDefined();
    });

    it('updates the search term', async function () {
        await unsplash.updateSearch('kitty');
        expect(unsplash.search_term).toBe('kitty');
    });

    it('resets and loads new photos when search term is cleared', async function () {
        await unsplash.updateSearch('');
        const photos = unsplash.getPhotos();
        expect(photos.length).toBe(30);
    });

    it('sets and updates pagination', async function () {
        await unsplash.loadNew();
        const pagination = unsplash._pagination;
        const paginationKeys = Object.keys(pagination);
        expect(paginationKeys.length).toBe(2);
        await unsplash.loadNextPage();
        const newPagination = unsplash._pagination;
        expect(newPagination).not.toBe(pagination);
    });

    it('loads next page of photos', async function () {
        await unsplash.loadNew();
        await unsplash.loadNextPage();
        const photos = unsplash.getPhotos();
        expect(photos.length).toBeGreaterThan(30);
    });
});
