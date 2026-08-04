import crypto from 'node:crypto';

export function getSchedulerIdempotencyKey(date: Readonly<Date>, url: Readonly<URL>): string {
    const hash = crypto.createHash('sha256');
    hash.update(date.toISOString());
    hash.update(url.href);
    return `ghost-automations-${hash.digest('hex')}`;
}
