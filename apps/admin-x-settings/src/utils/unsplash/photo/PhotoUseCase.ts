import {IUnsplashRepository} from '../api/UnsplashRepository';
import {Photo} from '../UnsplashTypes';

export class PhotoUseCases {
    private repository: IUnsplashRepository;

    constructor(repository: IUnsplashRepository) {
        this.repository = repository;
    }

    async fetchPhotos(): Promise<Photo[]> {
        return await this.repository.fetchPhotos();
    }

    async searchPhotos(term: string): Promise<Photo[]> {
        return await this.repository.searchPhotos(term);
    }

    async triggerDownload(photo: Photo): Promise<void> {
        this.repository.triggerDownload(photo);
    }

    async fetchNextPage(): Promise<Photo[] | null> {
        let request = await this.repository.fetchNextPage();

        if (request) {
            return request;
        }

        return null;
    }

    searchIsRunning(): boolean {
        return this.repository.searchIsRunning();
    }
}
