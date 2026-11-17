import { defineService } from '../../../../../../../core/kernel/define-service';
import type { LibraryDependencies } from '../../boot';
import { BookRepository } from '../../repositories/book.repository';
import { CatalogueService } from './catalogue.service';

export default defineService('Catalogue', ({ record, desk, logging }: LibraryDependencies) => {
  record('start catalogue');
  logging.info(`The catalogue is open at the ${desk.name} for loans of ${desk.loanDays} days`);
  return new CatalogueService({
    books: new BookRepository({ dune: 'Dune', emma: 'Emma' }),
    record,
  });
});
