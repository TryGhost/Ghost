// for testing purposes
import {Photo} from '../UnsplashTypes';
import {fixturePhotos} from './unsplashFixtures';

export class InMemoryUnsplashProvider {
    photos: Photo[] = fixturePhotos;
    PAGINATION: { [key: string]: string } = {};
    REQUEST_IS_RUNNING: boolean = false;
    SEARCH_IS_RUNNING: boolean = false;
    LAST_REQUEST_URL: string = '';
    ERROR: string | null = null;
    IS_LOADING: boolean = false;
    currentPage: number = 1;

    public async fetchPhotos(): Promise<Photo[]> {
        this.IS_LOADING = true;

        const start = (this.currentPage - 1) * 30;
        const end = this.currentPage * 30;
        this.currentPage += 1;

        this.IS_LOADING = false;

        return this.photos.slice(start, end);
    }

    public async fetchNextPage(): Promise<Photo[] | null> {
        if (this.REQUEST_IS_RUNNING || this.SEARCH_IS_RUNNING) {
            return null;
        }

        const photos = await this.fetchPhotos();
        return photos.length > 0 ? photos : null;
    }

    public async searchPhotos(term: string): Promise<Photo[]> {
        this.SEARCH_IS_RUNNING = true;
        const filteredPhotos = this.photos.filter(photo => photo.description?.includes(term) || photo.alt_description?.includes(term)
        );
        this.SEARCH_IS_RUNNING = false;

        return filteredPhotos;
    }

    searchIsRunning(): boolean {
        return this.SEARCH_IS_RUNNING;
    }

    triggerDownload(photo: Photo): void {
        () => {
            photo;
        };
    }
}
