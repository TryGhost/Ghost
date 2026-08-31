import type { FieldType } from '@tryghost/custom-field-types';
import { createRequiredBuilder } from '../factory';

/** Custom-field definitions are addressed by their immutable key, not a database ID. */
export interface MemberCustomField {
  key: string;
  name: string;
  type: FieldType;
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string | null;
}

export const memberCustomField = createRequiredBuilder<MemberCustomField, 'key' | 'name'>(() => ({
  type: 'short_text',
  status: 'active',
  created_at: new Date().toISOString(),
  updated_at: null,
}));
