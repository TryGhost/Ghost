const { addTable } = require('../../utils');

// Takes the table out of development, so `replaceDevelopmentCopy` replaces the copy that
// development and testing databases already have.
module.exports = addTable(
  'jobs_outbox',
  {
    id: { type: 'string', maxlength: 24, nullable: false, primary: true },
    envelope: { type: 'text', maxlength: 65535, nullable: false },
    created_at: { type: 'dateTime', nullable: false },
    available_at: { type: 'dateTime', nullable: false },
    submitted_at: { type: 'dateTime', nullable: true },
    '@@INDEXES@@': [['submitted_at', 'available_at']],
  },
  { replaceDevelopmentCopy: true },
);
