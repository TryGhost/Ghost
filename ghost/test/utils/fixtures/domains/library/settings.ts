import { defineSettings } from '@tryghost/kernel/domains/definitions';

export default defineSettings({
  groups: {
    library: {
      library_loan_days: { defaultValue: 14, type: 'number' },
      library_enabled: { defaultValue: 'true', type: 'boolean' },
    },
  },
  public: { library_enabled: 'library_enabled' },
  editable: ['library_loan_days', 'library_enabled'],
  calculated: {
    library_loan_weeks: {
      inputs: ['library_loan_days'],
      // The inputs arrive as arguments; a fragment reads nothing itself.
      calculate: ({ library_loan_days: days }) => Number(days) / 7,
    },
  },
});
