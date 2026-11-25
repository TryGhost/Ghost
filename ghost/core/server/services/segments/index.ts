import { defineService } from '../../../kernel/define-service';
import { ActionLog } from '../../lib/action-log/action-log';
import { recordSegmentChanges } from '../../lib/action-log/segments';
import { tracer } from '../../lib/tracing';
import { SegmentsService } from './service';
import { segmentsTracking } from './tracking';

// Needs the database connection, which boot has ready before initServices.
export default defineService('Segments', () => {
  const db: typeof import('../../data/db') = require('../../data/db');

  const recordHistory = recordSegmentChanges(new ActionLog());

  return new SegmentsService({
    knex: db.knex,
    tracking: segmentsTracking({ tracer }),
    // Each change is logged as a staff action inside the command that made it.
    onSegmentUpdated: recordHistory,
  });
});
