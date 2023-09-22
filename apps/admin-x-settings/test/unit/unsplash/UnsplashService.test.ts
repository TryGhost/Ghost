import MasonryService from '../../../src/utils/unsplash/masonry/MasonryService';
import {IUnsplashProvider} from '../../../src/utils/unsplash/api/UnsplashProvider';
import {InMemoryUnsplashProvider} from '../../../src/utils/unsplash/api/InMemoryUnsplashProvider';
import {PhotoUseCases} from '../../../src/utils/unsplash/photo/PhotoUseCase';
import {UnsplashService} from '../../../src/utils/unsplash/UnsplashService';
import {fixturePhotos} from '../../../src/utils/unsplash/api/unsplashFixtures';

describe('UnsplashService', () => {
    let unsplashService: UnsplashService;
    let unsplashProvider: IUnsplashProvider;
    let masonryService: MasonryService;
    let photoUseCases: PhotoUseCases;

    beforeEach(() => {
        unsplashProvider = new InMemoryUnsplashProvider();
        masonryService = new MasonryService(3);
        photoUseCases = new PhotoUseCases(unsplashProvider);
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
        await unsplashService.updateSearch('cat');
        const photos = unsplashService.photos;
        expect(photos.length).toBe(0);
        await unsplashService.updateSearch('photo');
        const photos2 = unsplashService.photos;
        expect(photos2.length).toBe(1);
    });

    it('can check if search is running', async function () {
        const isRunning = unsplashService.searchIsRunning();
        expect(isRunning).toBe(false);
    });

    it('can load next page', async function () {
        await unsplashService.loadNextPage();
        const photos = unsplashService.photos;
        expect(photos.length).toBe(2);
    });
});
