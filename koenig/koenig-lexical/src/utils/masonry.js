class MasonryLayout {
    constructor(columnCount) {
        this.columnCount = columnCount || 3;
        this.columns = null;
        this.columnHeights = null;
    }

    reset() {
        let columns = [];
        let columnHeights = [];
        // pre-fill column arrays based on columnCount
        for (let i = 0; i < this.columnCount; i += 1) {
            columns[i] = [];
            columnHeights[i] = 0;
        }
        this.columns = columns;
        this.columnHeights = columnHeights;
    }

    addColumns() {
        for (let i = 0; i < this.columnCount; i++) {
            this.columns.push([]);
            this.columnHeights.push(0);
        }
    }

    addPhotoToColumns(photo) {
        if (!this.columns) {
            this.reset();
        }
        let min = Math.min(...this.columnHeights);
        let columnIndex = this.columnHeights.indexOf(min);

        // use a fixed width when calculating height to compensate for different
        // overall image sizes
        this.columnHeights[columnIndex] += 300 * photo.ratio;
        this.columns[columnIndex].push(photo);
    }

    getColumns() {
        return this.columns;
    }

    changeColumnCount(newColumnCount) {
        if (newColumnCount !== this.columnCount) {
            this.columnCount = newColumnCount;
            this.reset();
        }
    }
}

export default MasonryLayout;
