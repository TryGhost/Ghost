import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import type { Knex } from 'knex';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RequestContext } from '../../lib/actor';
import type { ChangeEvents } from '../../lib/change-events';
import type { CheckoutConfigEvent } from './events';
import { DesignColumn } from './codec';
import type { StripeCheckoutConfig, StripeCheckoutDesign } from './models';
import { CONFIG_SLUG, CONFIG_TABLE } from './schema';
import { CheckoutConfigInput, parseRequest } from './serializers';

/** Reads and saves the site-wide Stripe Checkout config. */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private events: ChangeEvents<CheckoutConfigEvent>;

  constructor({ knex, events }: { knex: Knex; events: ChangeEvents<CheckoutConfigEvent> }) {
    this.knex = knex;
    this.events = events;
  }

  /**
   * Reads the config from the database, without caching it.
   *
   * A stored design that is no longer valid, such as one using a font Stripe has dropped, is
   * logged and treated as no design. Checkouts then use the Stripe dashboard design until the
   * publisher saves a new one.
   */
  async read(): Promise<StripeCheckoutConfig> {
    return { design: await this.readDesign() };
  }

  /** Saves the parts of the config that the request includes, then raises `CheckoutConfigSaved`. */
  async edit(context: RequestContext, input: unknown): Promise<void> {
    const { design } = parseRequest(CheckoutConfigInput, input, 'checkout_config');
    const previous = await this.read();
    const now = toDatabaseDate(new Date());

    // Only the columns for parts in the request are written, so saving one part never
    // overwrites another.
    const columns = z.encode(DesignColumn.partial(), design === undefined ? {} : { design });

    await this.knex(CONFIG_TABLE)
      .insert({
        id: new ObjectID().toHexString(),
        slug: CONFIG_SLUG,
        created_at: now,
        updated_at: now,
        ...columns,
      })
      .onConflict('slug')
      .merge({ ...columns, updated_at: now });

    // An existing row keeps its id, so read the id back for the event.
    const saved = await this.knex(CONFIG_TABLE).where('slug', CONFIG_SLUG).first('id');
    if (!saved) {
      throw new errors.InternalServerError({
        message: 'The Stripe Checkout config was not found right after saving it.',
      });
    }
    await this.events.raise(context.actor, {
      type: 'CheckoutConfigSaved',
      change: 'edited',
      previous,
      next: design === undefined ? previous : { ...previous, design },
      configId: saved.id,
    });
  }

  private async readDesign(): Promise<StripeCheckoutDesign | null> {
    const row = await this.knex(CONFIG_TABLE).where('slug', CONFIG_SLUG).first('design');
    const decoded = z.safeDecode(DesignColumn, row ?? { design: null });
    if (!decoded.success) {
      logging.warn(
        { event: { name: 'stripe_checkout.design.unreadable' }, err: decoded.error },
        'Ignoring a Stripe Checkout design that is no longer valid',
      );
      return null;
    }
    return decoded.data.design;
  }
}
