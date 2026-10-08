import ObjectID from 'bson-objectid';
import errors from '@tryghost/errors';
import logging from '@tryghost/logging';
import { z } from 'zod';
import type { Knex } from 'knex';
import { toDatabaseDate } from '../../lib/db-types/date';
import type { RecordCheckoutConfigAction, RequestContext } from './actions';
import { DesignColumn } from './codec';
import type { StripeCheckoutConfig, StripeCheckoutDesign } from './models';
import { CONFIG_SLUG, CONFIG_TABLE } from './schema';
import { CheckoutConfigInput, parseRequest } from './serializers';

/** Reads and saves the site-wide Stripe Checkout config. */
export class StripeCheckoutConfigService {
  private knex: Knex;
  private recordAction: RecordCheckoutConfigAction;

  constructor({ knex, recordAction }: { knex: Knex; recordAction: RecordCheckoutConfigAction }) {
    this.knex = knex;
    this.recordAction = recordAction;
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

  /**
   * Saves the parts of the config that the request includes, and records the save in the staff
   * history.
   */
  async edit(context: RequestContext, input: unknown): Promise<void> {
    const { design } = parseRequest(CheckoutConfigInput, input, 'checkout_config');
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

    // An existing row keeps its id, so read the id back for the history entry.
    const saved = await this.knex(CONFIG_TABLE).where('slug', CONFIG_SLUG).first('id');
    if (!saved) {
      throw new errors.InternalServerError({
        message: 'The Stripe Checkout config was not found right after saving it.',
      });
    }
    await this.recordAction({ context, subject: saved.id });
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
