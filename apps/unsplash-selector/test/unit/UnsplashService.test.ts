import {beforeEach, describe, expect, it} from 'vitest';

import MasonryService from '../../src/api/MasonryService';
import {IUnsplashService, UnsplashService} from '../../src/api/UnsplashService';
import {InMemoryUnsplashProvider} from '../../src/api/InMemoryUnsplashProvider';
import {PhotoUseCases} from '../../src/api/PhotoUseCase';
import {fixturePhotos} from '../../src/api/unsplashFixtures';

describe('UnsplashService', () => {
    let unsplashService: IUnsplashService;
    let UnsplashProvider: InMemoryUnsplashProvider;
    let masonryService: MasonryService;
    let photoUseCases: PhotoUseCases;

    beforeEach(() => {
        UnsplashProvider = new InMemoryUnsplashProvider();
        masonryService = new MasonryService(3);
        photoUseCases = new PhotoUseCases(UnsplashProvider);
        unsplashService = new UnsplashService(photoUseCases, masonryService);
    });

    it('can load new photos', async function () {
        await unsplashService.loadNew();
        const photos = unsplashService.photos;
        expect(photos).toEqual(fixturePhotos);
    });

    it('set up new columns of 3', async function () {
        await unsplashService.loadNew();
        const columns = unsplashService.getColumns();
        if (columns) {
            expect(columns.length).toBe(3);
        }
    });

    it('can search for photos', async function () {
        await unsplashService.updateSearch('somethingthatshouldnotexist');
        const photos = unsplashService.photos;
        expect(photos.length).toBe(0);
        await unsplashService.updateSearch('train station');
        const photos2 = unsplashService.photos;
        // we only have one photo with the description 'train station' in the dataset
        expect(photos2.length).toBe(1);
    });

    it('can check if search is running', async function () {
        const isRunning = unsplashService.searchIsRunning();
        expect(isRunning).toBe(false);
    });

    it('can load next page', async function () {
        await unsplashService.loadNextPage();
        const photos = unsplashService.photos;
        expect(photos.length).toBe(30);
    });
});
