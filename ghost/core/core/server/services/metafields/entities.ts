import { metafieldEntity } from './entity';

/**
 * Members, whose fields a publisher defines and whose values reach them from every
 * direction: staff in Admin, integrations, imports, a checkout's bindings and the member
 * themselves from their account. Each field says how much of it the member may see and
 * change through their own door.
 */
export const MEMBERS_ENTITY = metafieldEntity({
  table: 'members',
  foreignKey: 'member_id',
  writers: ['user', 'integration', 'import', 'binding', 'member'],
  surfaces: ['member'],
  definitionResource: 'member_custom_field',
});

/** Every entity with metafields, for what has to be wired once per entity. */
export const METAFIELD_ENTITIES = [MEMBERS_ENTITY] as const;
