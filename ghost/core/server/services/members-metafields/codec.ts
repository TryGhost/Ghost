import { z } from 'zod';
import { camelKeys, snakeKeys } from '../../lib/case-keys';
import { TypedSettingsSchema } from '@tryghost/metafield-types';
import { DbMetafield, DbTypedSettings } from './schema';
import { Metafield } from './models';

export const metafieldCodec = z.codec(DbMetafield, Metafield, {
  // DbMetafield validates `type` as the field-type enum, so the decoded row
  // already carries a FieldType and camelKeys preserves it — no cast needed. The settings
  // are read against that type, which is what pairs the two in the model.
  decode: ({ member_access: memberAccess, type, settings, ...row }, ctx) => {
    const typed = z.safeDecode(DbTypedSettings, { type, settings });
    if (!typed.success) {
      for (const issue of typed.error.issues) {
        ctx.issues.push({
          code: 'custom',
          message: issue.message,
          path: ['settings'],
          input: settings,
        });
      }
      return z.NEVER;
    }
    return { ...camelKeys(row), ...typed.data, access: { member: memberAccess } };
  },
  encode: ({ access, ...field }) => ({
    ...snakeKeys(field),
    // Read back into a type and settings first: what this receives types the two apart.
    settings: z.encode(
      DbTypedSettings,
      TypedSettingsSchema.parse({ type: field.type, settings: field.settings }),
    ).settings,
    member_access: access.member,
  }),
});
