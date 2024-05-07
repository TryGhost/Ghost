import {NestApplication} from '@nestjs/core';

interface IEvent<T> {
    data: T
    timestamp: Date
}

interface IDomainEvents {
    subscribe<T>(event: new (data: T, timestamp: Date) => IEvent<T>, fn: (_event: IEvent<T>) => void): void;
    dispatch<T>(event: IEvent<T>): void
}

type EventRegistrationSpec<EventData, Subscriber> = {
    Event: new (data: EventData, timestamp: Date) => IEvent<EventData>,
    target: new (...args: unknown[]) => Subscriber,
    methodName: string
};

const events: EventRegistrationSpec<unknown, unknown>[] = [];

export function OnEvent<T>(Event: new (data: T, timestamp: Date) => IEvent<T>) {
    return function (target: object, methodName: string) {
        events.push({
            Event: Event as new (data: unknown, timestamp: Date) => IEvent<T>,
            target: target.constructor as new (...args: unknown[]) => unknown,
            methodName
        });
    };
}

export function registerEvents(app: NestApplication, DomainEvents: IDomainEvents) {
    for (const eventSpec of events) {
        DomainEvents.subscribe(eventSpec.Event, async function (event: IEvent<unknown>) {
            // We have to cast to `any` here because we don't know the type - but we do know that it should have the `methodName` method
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const service = await app.resolve(eventSpec.target) as any;
            await service[eventSpec.methodName](event);
        });
    }
}
