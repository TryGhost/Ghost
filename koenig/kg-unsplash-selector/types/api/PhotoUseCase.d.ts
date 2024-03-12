import { IUnsplashProvider } from './IUnsplashProvider';
import { Photo } from '../UnsplashTypes';
export declare class PhotoUseCases {
    private _provider;
    constructor(provider: IUnsplashProvider);
    fetchPhotos(): Promise<Photo[]>;
    searchPhotos(term: string): Promise<Photo[]>;
    triggerDownload(photo: Photo): Promise<void>;
    fetchNextPage(): Promise<Photo[] | null>;
    searchIsRunning(): boolean;
}
