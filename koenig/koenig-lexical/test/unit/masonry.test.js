import MasonryLayout from '../../src/utils/masonry';
import UnsplashService from '../../src/utils/services/unsplash';
import {describe, it} from 'vitest';
import {fetch} from 'cross-fetch';
global.fetch = fetch; // polyfill to make fetch work in node

describe('Masonry Layout', function () {
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
    const masonry = new MasonryLayout();

    // load Unsplash so we have photos to test with

    it('should have a default column count of 3', function () {
        expect(masonry.columnCount).toBe(3);
    });

    it('prefills the columns with empty arrays', function () {
        masonry.reset();
        expect(masonry.columns.length).toBe(3);
        expect(masonry.columns[0].length).toBe(0);
        expect(masonry.columns[1].length).toBe(0);
        expect(masonry.columns[2].length).toBe(0);
    });

    it('can change column count', function () {
        masonry.changeColumnCount(4);
        expect(masonry.columnCount).toBe(4);
        expect(masonry.columns.length).toBe(4);
    });

    it('can add photos to the columns', async function () {
        await unsplash.loadNew();
        const photos = unsplash.getPhotos();
        photos.forEach((element) => {
            masonry.addPhotoToColumns(element);
        });
        expect(masonry.columns[0].length).not.toBe(0);
        expect(masonry.columns[1].length).not.toBe(0);
        expect(masonry.columns[2].length).not.toBe(0);
    });
});
