import { defineRoutes } from '@tryghost/kernel/domains/definitions';

export default defineRoutes([
  {
    surface: 'admin',
    method: 'get',
    path: '/books',
    middleware: ['authAdminApi'],
    handler: 'book.controller#browse',
  },
  {
    surface: 'admin',
    method: 'post',
    path: '/books/:id/loans',
    middleware: ['authAdminApi'],
    handler: 'book.controller#lend',
  },
  { surface: 'content', method: 'get', path: '/books', handler: 'book.controller#browse' },
]);
