import { addTable } from '../../utils';

export default addTable('segments', {
  id: { type: 'string', maxlength: 24, nullable: false, primary: true },
  name: { type: 'string', maxlength: 191, nullable: false, unique: true },
  filter: { type: 'text', maxlength: 65535, nullable: false },
  sort_order: { type: 'integer', nullable: false, unsigned: true, defaultTo: 0 },
  created_at: { type: 'dateTime', nullable: false },
  updated_at: { type: 'dateTime', nullable: true },
});
