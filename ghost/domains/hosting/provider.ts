/** What the application must call in the hosting domain. */
import { defineProvider, on } from '#support/define-provider';
import { MemberCreatedEvent } from '../../shared/transition/member-events';

export default defineProvider({
  name: 'hosting',
  listeners: [
    on(MemberCreatedEvent, () =>
      require('./listeners/trigger-verification-when-member-created.listener'),
    ),
  ],
});
