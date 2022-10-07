# Member Events

## Usage

```
const {MemberEntryViewEvent} = require('@tryghost/member-events');

const event = MemberEntryViewEvent.create({
    memberId: member.id,
    memberStatus: member.status,
    entryId: post.id,
    entryUrl: post.url
});

const DomainEvents = require('@tryghost/domain-events');

DomainEvents.dispatch(event);
```
