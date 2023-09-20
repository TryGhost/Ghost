// for testing purposes
import {IUnsplashRepository} from '../../../src/utils/unsplash/api/UnsplashRepository';
import {Photo} from '../../../src/utils/unsplash/UnsplashTypes';

export class InMemoryUnsplashRepository implements IUnsplashRepository {
    private photos: Photo[] = []; // Mock data
    pagination: { [key: string]: string } = {};
    private currentPage: number = 1;
    private searchTerm: string = '';
    error: string | null = null;

    constructor(photoset: Photo[] = []) {
        this.photos = photoset;
    }

    public async fetchPhotos(): Promise<Photo[]> {
        const start = (this.currentPage - 1) * 30;
        const end = this.currentPage * 30;
        this.currentPage += 1;

        return this.photos.slice(start, end);
    }

    public async fetchNextPage(): Promise<Photo[] | null> {
        if (this.searchTerm) {
            return null; // Simulate no next page when search is active
        }

        const photos = await this.fetchPhotos();

        return photos;
    }

    public async searchPhotos(term: string): Promise<Photo[]> {
        this.searchTerm = term;
        const filteredPhotos = this.photos.filter(photo => photo.description?.includes(term) || photo.alt_description?.includes(term)
        );

        return filteredPhotos;
    }

    public triggerDownload(photo: Photo): void {
        () => {
            photo;
        };
    }

    searchIsRunning(): boolean {
        return false;
    }
}
