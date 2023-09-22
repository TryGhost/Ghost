import {IUnsplashProvider} from '../api/UnsplashProvider';
import {Photo} from '../UnsplashTypes';

export class PhotoUseCases {
    private _provider: IUnsplashProvider;

    constructor(provider: IUnsplashProvider) {
        this._provider = provider;
    }

    async fetchPhotos(): Promise<Photo[]> {
        return await this._provider.fetchPhotos();
    }

    async searchPhotos(term: string): Promise<Photo[]> {
        return await this._provider.searchPhotos(term);
    }

    async triggerDownload(photo: Photo): Promise<void> {
        this._provider.triggerDownload(photo);
    }

    async fetchNextPage(): Promise<Photo[] | null> {
        let request = await this._provider.fetchNextPage();

        if (request) {
            return request;
        }

        return null;
    }

    searchIsRunning(): boolean {
        return this._provider.searchIsRunning();
    }
}
