import { defineListener } from '@tryghost/kernel/domains/definitions';
import recommendations from '../services/recommendations';

type ReceivedMention = Parameters<
  (typeof recommendations)['service']['incomingService']['receiveMention']
>[0];

// MentionCreatedEvent is still published by the legacy mentions service, which
// this file may not import, so the event is named rather than imported. The
// event bus keys events by class name. When mentions moves into this domain the
// name becomes an import from ../events.
export default defineListener({
  event: 'MentionCreatedEvent',
  handle: (event: { data: { mention: ReceivedMention } }) =>
    recommendations.service.incomingService.receiveMention(event.data.mention),
});
