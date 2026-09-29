import MasonryService from './MasonryService';
import { Photo } from '../UnsplashTypes';
import { PhotoUseCases } from './PhotoUseCase';

export interface IUnsplashService {
  loadNew(): Promise<boolean>;
  layoutPhotos(): void;
  getColumns(): Photo[][] | [] | null;
  updateSearch(term: string): Promise<boolean>;
  loadNextPage(): Promise<boolean>;
  clearPhotos(): void;
  triggerDownload(photo: Pick<Photo, 'links'>): void;
  photos: Photo[];
  searchIsRunning(): boolean;
}

export class UnsplashService implements IUnsplashService {
  private photoUseCases: PhotoUseCases;
  private masonryService: MasonryService;
  public photos: Photo[] = [];
  // Bumped whenever the gallery's contents are replaced, so results from a
  // superseded request are discarded rather than overwriting newer ones
  private generation: number = 0;

  constructor(photoUseCases: PhotoUseCases, masonryService: MasonryService) {
    this.photoUseCases = photoUseCases;
    this.masonryService = masonryService;
  }

  // Resolves to false when a newer load or search superseded this one
  async loadNew() {
    this.generation += 1;
    const generation = this.generation;
    let images = await this.photoUseCases.fetchPhotos();
    if (generation !== this.generation) {
      return false;
    }
    this.photos = images;
    await this.layoutPhotos();
    return true;
  }

  async layoutPhotos() {
    this.masonryService.reset();

    if (this.photos) {
      this.photos.forEach((photo) => {
        photo.ratio = photo.height / photo.width;
        this.masonryService.addPhotoToColumns(photo);
      });
    }
  }

  getColumns() {
    return this.masonryService.getColumns();
  }

  async updateSearch(term: string) {
    this.generation += 1;
    const generation = this.generation;
    let results = await this.photoUseCases.searchPhotos(term);
    if (generation !== this.generation) {
      return false;
    }
    this.photos = results;
    this.layoutPhotos();
    return true;
  }

  async loadNextPage() {
    const generation = this.generation;
    const newPhotos = (await this.photoUseCases.fetchNextPage()) || [];
    if (generation !== this.generation) {
      return false;
    }
    this.photos = [...this.photos, ...newPhotos];
    this.layoutPhotos();
    return true;
  }

  clearPhotos() {
    this.photos = [];
  }

  triggerDownload(photo: Pick<Photo, 'links'>) {
    this.photoUseCases.triggerDownload(photo);
  }

  searchIsRunning() {
    return this.photoUseCases.searchIsRunning();
  }
}
