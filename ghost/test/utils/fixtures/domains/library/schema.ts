import { defineSchema } from '@tryghost/kernel/domains/definitions';

export default defineSchema({
  tables: {
    books: {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      title: { type: 'string', maxlength: 191, nullable: false },
    },
  },
});
