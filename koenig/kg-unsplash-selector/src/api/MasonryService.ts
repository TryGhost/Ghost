import {Photo} from '../UnsplashTypes';

export default class MasonryService {
    public columnCount: number;
    public columns: Photo[][] | [] = [];
    public columnHeights: number[] | null;
  
    constructor(columnCount: number = 3) {
        this.columnCount = columnCount;
        this.columns = [[]];
        this.columnHeights = null;
    }
  
    reset(): void {
        let columns: Photo[][] = [];
        let columnHeights: number[] = [];

        for (let i = 0; i < this.columnCount; i += 1) {
            columns[i] = [];
            columnHeights[i] = 0;
        }
        
        this.columns = columns;
        this.columnHeights = columnHeights;
    }
  
    addColumns(): void {
        for (let i = 0; i < this.columnCount; i++) {
            (this.columns as Photo[][]).push([]);
            this.columnHeights!.push(0);
        }
    }
  
    addPhotoToColumns(photo: Photo): void {
        if (!this.columns) {
            this.reset();
        }
        let min = Math.min(...this.columnHeights!);
        let columnIndex = this.columnHeights!.indexOf(min);

      this.columnHeights![columnIndex] += 300 * photo.ratio;
      this.columns![columnIndex].push(photo);
    }
  
    getColumns(): Photo[][] | null {
        return this.columns;
    }

    changeColumnCount(newColumnCount: number): void {
        if (newColumnCount !== this.columnCount) {
            this.columnCount = newColumnCount;
            this.reset();
        }
    }
}
