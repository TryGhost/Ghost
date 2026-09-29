import { beforeEach, describe, expect, it } from 'vitest';

import MasonryService from '../../src/api/MasonryService';
import { IUnsplashService, UnsplashService } from '../../src/api/UnsplashService';
import { InMemoryUnsplashProvider } from '../../src/api/InMemoryUnsplashProvider';
import { Photo } from '../../src/UnsplashTypes';
import { PhotoUseCases } from '../../src/api/PhotoUseCase';
import { fixturePhotos } from '../../src/api/unsplashFixtures';

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
    expect(photos.length).toBe(29);
  });

  it('ignores results from a search that a newer one superseded', async function () {
    const resolvers: Record<string, (photos: Photo[]) => void> = {};
    const deferredProvider = new InMemoryUnsplashProvider();
    deferredProvider.searchPhotos = (term: string) =>
      new Promise<Photo[]>((resolve) => {
        resolvers[term] = resolve;
      });
    const service = new UnsplashService(new PhotoUseCases(deferredProvider), new MasonryService(3));

    const partialSearch = service.updateSearch('Germ');
    const fullSearch = service.updateSearch('Germany');

    resolvers.Germany([fixturePhotos[0]]);
    expect(await fullSearch).toBe(true);

    resolvers.Germ([fixturePhotos[1], fixturePhotos[2]]);
    expect(await partialSearch).toBe(false);

    expect(service.photos).toEqual([fixturePhotos[0]]);
  });

  it('does not append a next page that finished after a new search', async function () {
    let resolveNextPage: (photos: Photo[]) => void = () => {};
    const deferredProvider = new InMemoryUnsplashProvider();
    deferredProvider.fetchNextPage = () =>
      new Promise<Photo[]>((resolve) => {
        resolveNextPage = resolve;
      });
    const service = new UnsplashService(new PhotoUseCases(deferredProvider), new MasonryService(3));

    const nextPage = service.loadNextPage();
    await service.updateSearch('train station');

    resolveNextPage([fixturePhotos[1]]);
    expect(await nextPage).toBe(false);

    expect(service.photos.length).toBe(1);
  });
});
