import Bookshelf from 'bookshelf';

declare function createModels(ghostBookshelf: Bookshelf): Record<string, unknown>;

export = createModels;
