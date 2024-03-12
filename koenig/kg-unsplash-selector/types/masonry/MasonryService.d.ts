import { Photo } from '../UnsplashTypes';
export default class MasonryService {
    columnCount: number;
    columns: Photo[][] | [];
    columnHeights: number[] | null;
    constructor(columnCount?: number);
    reset(): void;
    addColumns(): void;
    addPhotoToColumns(photo: Photo): void;
    getColumns(): Photo[][] | null;
    changeColumnCount(newColumnCount: number): void;
}
