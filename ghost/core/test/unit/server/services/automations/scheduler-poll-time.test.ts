import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {getSchedulerPollTime} from '../../../../../core/server/services/automations/scheduler-poll-time';

const addSeconds = (date: Readonly<Date>, seconds: number): Date => new Date(date.getTime() + seconds * 1000);

function* everyFiveSecondsOfJanuaryFirst(): Iterable<Date> {
    const startAt = new Date('2020-01-01T00:00:00.000Z');
    const endAt = new Date('2020-01-02T00:00:00.000Z');
    for (let t = startAt; t < endAt; t = addSeconds(t, 5)) {
        yield t;
    }
}

describe('getSchedulerPollTime', function () {
    it('splits times into 15-minute intervals', function () {
        const siteIdentifier = crypto.randomUUID();
        const times = new Set<number>();
        for (const t of everyFiveSecondsOfJanuaryFirst()) {
            const scheduledTime = getSchedulerPollTime(t, siteIdentifier);
            times.add(scheduledTime.getTime());
        }

        const numberOfTimes = times.size;
        assert(
            numberOfTimes === 95 || numberOfTimes === 96 || numberOfTimes === 97,
            '1 day should be split into 15 minute intervals (possibly ±1 interval for jitter)'
        );
    });

    it('returns an interval now or in the future, within 15 minutes', function () {
        const siteIdentifier = crypto.randomUUID();

        for (const t of everyFiveSecondsOfJanuaryFirst()) {
            const scheduledTime = getSchedulerPollTime(t, siteIdentifier);
            assert(scheduledTime >= t, 'result is not in the past');
            assert(scheduledTime.getTime() - t.getTime() < 15 * 60 * 1000, 'result is within 15 minutes');
        }
    });

    it('does not advance to the next interval when the requested time is already a cadence tick', function () {
        const siteIdentifier = crypto.randomUUID();

        const cadenceTick = getSchedulerPollTime(new Date('2020-04-20T17:02:00.000Z'), siteIdentifier);
        const scheduledTime = getSchedulerPollTime(cadenceTick, siteIdentifier);

        assert.deepEqual(scheduledTime, cadenceTick);
    });

    it('uses different cadences for different sites', function () {
        const requestedTime = new Date('2020-04-20T17:02:00.000Z');
        // We treat the function as a black box. If we change the function's
        // "hashing" somehow, it's possible we'll hit a collision with these
        // site IDs. If that happens, just regenerate these and it should work.
        const siteId1 = 'c56b303e-4529-417c-8372-3880994d63a9';
        const siteId2 = 'a93e268f-e8fb-4df9-bbf8-43dc3674762c';

        assert.notEqual(
            getSchedulerPollTime(requestedTime, siteId1).getTime(),
            getSchedulerPollTime(requestedTime, siteId2).getTime()
        );
    });
});
