import {tracked} from '@glimmer/tracking';

export default class SelectionList {
    @tracked selectedIds = new Set();
    @tracked inverted = false;
    @tracked lastSelectedId = null;
    @tracked lastShiftSelectionGroup = new Set();

    infinityModel;

    constructor(infinityModel) {
        this.infinityModel = infinityModel ?? {content: []};
    }

    /**
     * Returns an NQL filter for all items, not the selection
     */
    get allFilter() {
        return this.infinityModel.extraParams?.filter ?? '';
    }

    /**
     * Returns an NQL filter for the current selection
     */
    get filter() {
        if (this.inverted) {
            if (this.allFilter) {
                if (this.selectedIds.size === 0) {
                    return this.allFilter;
                }
                return `(${this.allFilter})+id:-['${[...this.selectedIds].join('\',\'')}']`;
            }
            if (this.selectedIds.size === 0) {
                // Select all
                return '';
            }
            return `id:-['${[...this.selectedIds].join('\',\'')}']`;
        }
        if (this.selectedIds.size === 0) {
            // Select nothing
            return 'id:nothing';
        }
        // Only based on the ids
        return `id:['${[...this.selectedIds].join('\',\'')}']`;
    }

    /**
     * Create an empty copy
     */
    cloneEmpty() {
        return new SelectionList(this.infinityModel);
    }

    /**
     * Return a list of models that are already loaded in memory.
     * Keep in mind that when using CMD + A, we don't have all items in memory!
     */
    get availableModels() {
        const arr = [];
        for (const item of this.infinityModel.content) {
            if (this.isSelected(item.id)) {
                arr.push(item);
            }
        }
        return arr;
    }

    get isSingle() {
        return this.selectedIds.size === 1 && !this.inverted;
    }

    isSelected(id) {
        if (this.inverted) {
            return !this.selectedIds.has(id);
        }
        return this.selectedIds.has(id);
    }

    toggleItem(id) {
        this.lastShiftSelectionGroup = new Set();
        this.lastSelectedId = id;

        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);
        } else {
            this.selectedIds.add(id);
        }

        // Force update
        // eslint-disable-next-line no-self-assign
        this.selectedIds = this.selectedIds;
    }

    /**
     * Select all items between the last selection or the first one if none
     */
    shiftItem(id) {
        // Unselect last selected items
        for (const item of this.lastShiftSelectionGroup) {
            if (this.inverted) {
                this.selectedIds.add(item);
            } else {
                this.selectedIds.delete(item);
            }
        }
        this.lastShiftSelectionGroup = new Set();

        // todo
        let running = false;

        if (this.lastSelectedId === null) {
            running = true;
        }

        for (const item of this.infinityModel.content) {
            // Exlusing the last selected item
            if (item.id === this.lastSelectedId || item.id === id) {
                if (!running) {
                    running = true;

                    // Skip last selected on its own
                    if (item.id === this.lastSelectedId) {
                        continue;
                    }
                } else {
                    // Still include id
                    if (item.id === id) {
                        this.lastShiftSelectionGroup.add(item.id);

                        if (this.inverted) {
                            this.selectedIds.delete(item.id);
                        } else {
                            this.selectedIds.add(item.id);
                        }
                    }
                    break;
                }
            }

            if (running) {
                this.lastShiftSelectionGroup.add(item.id);
                if (this.inverted) {
                    this.selectedIds.delete(item.id);
                } else {
                    this.selectedIds.add(item.id);
                }
            }
        }

        // Force update
        // eslint-disable-next-line no-self-assign
        this.selectedIds = this.selectedIds;
    }

    selectAll() {
        this.selectedIds = new Set();
        this.inverted = !this.inverted;
    }

    clearSelection() {
        this.selectedIds = new Set();
        this.inverted = false;
    }
}
