import MasonryService from './masonry/MasonryService';
import {Photo} from './UnsplashTypes';
import {PhotoUseCases} from './photo/PhotoUseCase';

export interface IUnsplashService {
    loadNew(): Promise<void>;
    layoutPhotos(): void;
    getColumns(): Photo[][] | [] | null;
    updateSearch(term: string): Promise<void>;
    loadNextPage(): Promise<void>;
    clearPhotos(): void;
    triggerDownload(photo: Photo): void;
    photos: Photo[];
    searchIsRunning(): boolean;
}

export class UnsplashService implements IUnsplashService {
    private photoUseCases: PhotoUseCases;
    private masonryService: MasonryService;
    public photos: Photo[] = [];
  
    constructor(photoUseCases: PhotoUseCases, masonryService: MasonryService) {
        this.photoUseCases = photoUseCases;
        this.masonryService = masonryService;
    }
  
    async loadNew() {
        let images = await this.photoUseCases.fetchPhotos();
        this.photos = images;
        await this.layoutPhotos();
    }
  
    async layoutPhotos() {
        this.masonryService.reset();
        this.photos.forEach((photo) => {
            photo.ratio = photo.height / photo.width;
            this.masonryService.addPhotoToColumns(photo);
        });
    }
  
    getColumns() {
        return this.masonryService.getColumns();
    }
  
    async updateSearch(term: string) {
        let results = await this.photoUseCases.searchPhotos(term);
        this.photos = results;
        this.layoutPhotos();
    }
  
    async loadNextPage() {
        const newPhotos = await this.photoUseCases.fetchNextPage() || [];
        this.photos = [...this.photos, ...newPhotos];
        this.layoutPhotos();
    }
  
    clearPhotos() {
        this.photos = [];
    }

    triggerDownload(photo: Photo) {
        this.photoUseCases.triggerDownload(photo);
    }

    searchIsRunning() {
        return this.photoUseCases.searchIsRunning();
    }
}
