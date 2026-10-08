import {
  metafieldDefinitionEvents,
  type MetafieldDefinitionEvent,
} from '../members-metafields/events';
import type { Metafield } from '../members-metafields/models';
import { createActionLog, type ActionDescription } from './action-log';

/**
 * A field's name, and its key: the key is how a field is addressed publicly, so stored with
 * each action it lets a field's actions be found after the field is permanently deleted.
 */
function describeField(field: Metafield, details: Record<string, unknown> = {}): ActionDescription {
  return { name: field.name, details: { key: field.key, ...details } };
}

export const memberCustomFieldActionLog = createActionLog<Metafield, MetafieldDefinitionEvent>({
  events: metafieldDefinitionEvents,
  // The field's id rather than its key, because `resource_id` holds at most 24 characters
  // and a key can be longer.
  idOf: (field) => field.id,
  describe: (event) => {
    switch (event.type) {
      case 'MetafieldAdded':
        return describeField(event.next);
      case 'MetafieldRenamed':
        return describeField(event.next, { previous_name: event.previous.name });
      case 'MetafieldAccessChanged':
        return describeField(event.next, {
          member_access: event.next.access.member,
          previous_member_access: event.previous.access.member,
        });
      case 'MetafieldArchived':
        return { ...describeField(event.next), actionName: 'archived' };
      case 'MetafieldRestored':
        return { ...describeField(event.next), actionName: 'restored' };
      case 'MetafieldDeleted':
        return describeField(event.previous);
      case 'MetafieldsReordered':
        return { name: 'Custom fields', actionName: 'reordered' };
    }
  },
});
