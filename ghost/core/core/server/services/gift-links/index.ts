import type {Request, Response} from 'express';
import {GiftLinksService} from './service';

interface ReadContext {
    token: string;
    postId: string;
}

// Set by init() at boot, not at import: knex only exists once the DB has connected.
export let service: GiftLinksService | undefined;

export function init(): void {
    if (service) {
        return;
    }

    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const {knex} = require('../../data/db');

    service = new GiftLinksService({knex});
}

// Test seam: inject (or clear) the service singleton. The exported `service`
// binding is read-only to importers once compiled, so tests that need a stubbed
// service set it through here rather than by assignment.
export function setService(stub: GiftLinksService | undefined): void {
    service = stub;
}

// The frontend reader path (/g/) records reads through this seam. Lazily
// required (on access, not at module load) so this module stays cheap to
// require at boot without pulling in the read-counter's web deps (cookies, etc).
export function recordRead(req: Request, res: Response, read: ReadContext): void {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const counter = require('./read-counter') as (_req: Request, _res: Response, _read: ReadContext) => void;
    counter(req, res, read);
}
