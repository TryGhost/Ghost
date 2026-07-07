import Bookshelf from 'bookshelf';
import {Knex} from 'knex';

declare function createBookshelf(knex: Knex): Bookshelf;

export = createBookshelf;
