# Member Events

## Install

`npm install @tryghost/member-events --save`

or

`yarn add @tryghost/member-events`


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


## Develop

This is a mono repository, managed with [lerna](https://lernajs.io/).

Follow the instructions for the top-level repo.
1. `git clone` this repo & `cd` into it as usual
2. Run `yarn` to install top-level dependencies.


## Run

- `yarn dev`


## Test

- `yarn lint` run just eslint
- `yarn test` run lint and tests


