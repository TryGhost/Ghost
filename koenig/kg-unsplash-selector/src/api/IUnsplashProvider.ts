import {Photo} from '../UnsplashTypes';

export interface IUnsplashProvider {
    fetchPhotos(): Promise<Photo[]>;
    fetchNextPage(): Promise<Photo[] | null>;
    searchPhotos(term: string): Promise<Photo[]>;
    triggerDownload(photo: Photo): Promise<void> | void;
    searchIsRunning(): boolean;
}
