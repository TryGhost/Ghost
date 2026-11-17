import { defineSchema } from '@tryghost/kernel/domains/definitions';

export default defineSchema({
  tables: {
    recommendations: {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      url: { type: 'string', maxlength: 2000, nullable: false },
      title: { type: 'string', maxlength: 2000, nullable: false },
      excerpt: { type: 'string', maxlength: 2000, nullable: true },
      featured_image: { type: 'string', maxlength: 2000, nullable: true },
      favicon: { type: 'string', maxlength: 2000, nullable: true },
      description: { type: 'string', maxlength: 2000, nullable: true },
      one_click_subscribe: { type: 'boolean', nullable: false, defaultTo: false },
      created_at: { type: 'dateTime', nullable: false },
      updated_at: { type: 'dateTime', nullable: true },
    },
    recommendation_click_events: {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      recommendation_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'recommendations.id',
        unique: false,
        cascadeDelete: true,
      },
      member_id: {
        type: 'string',
        maxlength: 24,
        nullable: true,
        references: 'members.id',
        unique: false,
        setNullDelete: true,
      },
      created_at: { type: 'dateTime', nullable: false },
    },
    recommendation_subscribe_events: {
      id: { type: 'string', maxlength: 24, nullable: false, primary: true },
      recommendation_id: {
        type: 'string',
        maxlength: 24,
        nullable: false,
        references: 'recommendations.id',
        unique: false,
        cascadeDelete: true,
      },
      member_id: {
        type: 'string',
        maxlength: 24,
        nullable: true,
        references: 'members.id',
        unique: false,
        setNullDelete: true,
      },
      created_at: { type: 'dateTime', nullable: false },
    },
  },
});
