import { giftLinkEvents } from './events';
import { GiftLinksService } from './service';

export type { RequestContext } from '../../lib/actor';

// Constructed by init() at boot, not at import: knex is only available once the DB has connected.
export let service: GiftLinksService | undefined;

export function init(): void {
  if (service) {
    return;
  }

  const { knex } = require('../../data/db');
  service = new GiftLinksService({ knex, events: giftLinkEvents });
}
