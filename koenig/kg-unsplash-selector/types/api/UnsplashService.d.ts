import MasonryService from './MasonryService';
import { Photo } from '../UnsplashTypes';
import { PhotoUseCases } from './PhotoUseCase';
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
export declare class UnsplashService implements IUnsplashService {
    private photoUseCases;
    private masonryService;
    photos: Photo[];
    constructor(photoUseCases: PhotoUseCases, masonryService: MasonryService);
    loadNew(): Promise<void>;
    layoutPhotos(): Promise<void>;
    getColumns(): Photo[][] | null;
    updateSearch(term: string): Promise<void>;
    loadNextPage(): Promise<void>;
    clearPhotos(): void;
    triggerDownload(photo: Photo): void;
    searchIsRunning(): boolean;
}
