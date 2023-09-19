import {Photo} from './UnsplashTypes';

export default class MasonryService {
    private columnCount: number;
    private columns: number[][] | null;
    private columnHeights: number[] | null;
  
    constructor(columnCount: number = 3) {
        this.columnCount = columnCount;
        this.columns = null;
        this.columnHeights = null;
    }
  
    reset(): void {
        let columns: number[][] = [];
        let columnHeights: number[] = [];
        // pre-fill column arrays based on columnCount
        for (let i = 0; i < this.columnCount; i += 1) {
            columns[i] = [];
            columnHeights[i] = 0;
        }
        this.columns = columns;
        this.columnHeights = columnHeights;
    }
  
    addColumns(): void {
        for (let i = 0; i < this.columnCount; i++) {
        this.columns!.push([]);
        this.columnHeights!.push(0);
        }
    }
  
    addPhotoToColumns(photo: Photo): void {
        if (!this.columns) {
            this.reset();
        }
        let min = Math.min(...this.columnHeights!);
        let columnIndex = this.columnHeights!.indexOf(min);
  
      // use a fixed width when calculating height (높이 계산할 때 고정된 폭 사용) to compensate for different
      // overall image sizes
      this.columnHeights![columnIndex] += 300 * photo.ratio;
      this.columns![columnIndex].push(photo.ratio);
    }
  
    getColumns(): number[][] | null {
        return this.columns;
    }
  
    changeColumnCount(newColumnCount: number): void {
        if (newColumnCount !== this.columnCount) {
            this.columnCount = newColumnCount;
            this.reset();
        }
    }
}
