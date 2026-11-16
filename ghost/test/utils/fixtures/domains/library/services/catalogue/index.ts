import { defineService } from '../../../../../../../core/kernel/define-service';
import type { LibraryDependencies } from '../../boot';
import { BookRepository } from '../../repositories/book.repository';
import { CatalogueService } from './catalogue.service';

export default defineService('Catalogue', ({ record }: LibraryDependencies) => {
  record('start catalogue');
  return new CatalogueService({
    books: new BookRepository({ dune: 'Dune', emma: 'Emma' }),
    record,
  });
});
