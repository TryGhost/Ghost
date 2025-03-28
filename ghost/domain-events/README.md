# Domain Events

## Usage

```js
const DomainEvents = require('@tryghost/domain-events');

class MyEvent {
    constructor(message) {
        this.timestamp = new Date();
        this.data = {
            message
        };
    }
}

DomainEvents.subscribe(MyEvent, function handler(event) {
    console.log(event.data.message);
});

const event = new MyEvent('hello world');

DomainEvents.dispatch(event);
```
