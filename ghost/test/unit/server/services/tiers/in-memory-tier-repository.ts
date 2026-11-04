const nql = require('@tryghost/nql');

interface StoredTier {
  id: { toHexString(): string; equals(other: unknown): boolean };
  status: string;
  type: string;
}

/** Keeps tiers in memory for the TiersAPI units; production uses TierRepository. */
export class InMemoryTierRepository<Tier extends StoredTier> {
  #store: Tier[] = [];
  #ids: Record<string, true> = {};

  toPrimitive(tier: Tier) {
    return {
      ...tier,
      active: tier.status === 'active',
      type: tier.type,
      id: tier.id.toHexString(),
    };
  }

  async save(tier: Tier): Promise<void> {
    if (this.#ids[tier.id.toHexString()]) {
      const existing = this.#store.findIndex((item) => {
        return item.id.equals(tier.id);
      });
      this.#store.splice(existing, 1, tier);
    } else {
      this.#store.push(tier);
      this.#ids[tier.id.toHexString()] = true;
    }
  }

  async getById(id: unknown): Promise<Tier | undefined> {
    return this.#store.find((item) => {
      return item.id.equals(id);
    });
  }

  async getAll(options: { filter?: unknown } = {}): Promise<Tier[]> {
    const filter = nql();
    filter.filter = options.filter || {};
    return this.#store.slice().filter((item) => {
      return filter.queryJSON(this.toPrimitive(item));
    });
  }
}
