import { defineSettings } from '@tryghost/kernel/domains/definitions';

export default defineSettings({
  groups: {
    recommendations: {
      recommendations_enabled: {
        defaultValue: 'false',
        validations: {
          isEmpty: false,
          isIn: [['true', 'false']],
        },
        type: 'boolean',
      },
    },
  },
  public: { recommendations_enabled: 'recommendations_enabled' },
  editable: ['recommendations_enabled'],
});
