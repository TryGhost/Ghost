import {tracked} from '@glimmer/tracking';

export default class SelectionList {
    @tracked selectedIds = new Set();
    @tracked inverted = false;
    @tracked lastSelectedId = null;
    @tracked lastShiftSelectionGroup = new Set();

    enabled = true;

    infinityModel;

    #frozen = false;

    /**
     * When doing right click on an item, we temporarily select it, but want to clear it as soon as we close the context menu.
     */
    #clearOnNextUnfreeze = false;

    constructor(infinityModel) {
        this.infinityModel = infinityModel ?? {content: []};
    }

    freeze() {
        this.#frozen = true;
    }

    unfreeze() {
        this.#frozen = false;
        if (this.#clearOnNextUnfreeze) {
            this.clearSelection();
            this.#clearOnNextUnfreeze = false;
        }
    }

    clearOnNextUnfreeze() {
        this.#clearOnNextUnfreeze = true;
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

    get first() {
        return this.availableModels[0];
    }

    get isSingle() {
        return this.selectedIds.size === 1 && !this.inverted;
    }

    get count() {
        if (!this.inverted) {
            return this.selectedIds.size;
        }
        return Math.max((this.infinityModel.meta?.pagination?.total ?? 0) - this.selectedIds.size, 1);
    }

    isSelected(id) {
        if (this.inverted) {
            return !this.selectedIds.has(id);
        }
        return this.selectedIds.has(id);
    }

    toggleItem(id) {
        if (this.#frozen) {
            return;
        }
        this.lastShiftSelectionGroup = new Set();

        if (this.selectedIds.has(id)) {
            this.selectedIds.delete(id);

            if (!this.inverted) {
                if (this.lastSelectedId === id) {
                    this.lastSelectedId = null;
                }
            } else {
                // Shift behaviour in inverted mode needs a review
                this.lastSelectedId = id;
            }
        } else {
            this.selectedIds.add(id);

            if (!this.inverted) {
                this.lastSelectedId = id;
            } else {
                // Shift behaviour in inverted mode needs a review
                this.lastSelectedId = id;
            }
        }

        // Force update
        // eslint-disable-next-line no-self-assign
        this.selectedIds = this.selectedIds;
    }

    clearUnavailableItems() {
        const newSelection = new Set();
        for (const item of this.infinityModel.content) {
            if (this.selectedIds.has(item.id)) {
                newSelection.add(item.id);
            }
        }
        this.selectedIds = newSelection;
    }

    /**
     * Select all items between the last selection or the first one if none
     */
    shiftItem(id) {
        if (this.#frozen) {
            return;
        }
        if (this.lastSelectedId === null) {
            // Do a normal toggle
            this.toggleItem(id);
            return;
        }

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
        if (this.#frozen) {
            return;
        }
        this.selectedIds = new Set();
        this.inverted = !this.inverted;
        this.lastSelectedId = null;
    }

    clearSelection(options = {}) {
        if (this.#frozen && !options.force) {
            return;
        }
        this.selectedIds = new Set();
        this.inverted = false;
        this.lastSelectedId = null;
    }
}
