type ProductRow = Record<string, unknown> & { id: string; monthly_price?: number };
type Operation = 'read' | 'write' | 'reply';

/**
 * Stands in for the Product model and its table. Every repository given the
 * same fake reads what any of them saved, as instances sharing a database do.
 */
export class FakeProductModel {
  readonly #rows = new Map<string, ProductRow>();
  readonly #held = new Map<Operation, Promise<void>>();

  /**
   * Holds the next read or write until the returned function is called, so a
   * test can land other work in between. A held read sees the table as it was
   * when it started; a held write changes the table only once released; a held
   * reply changes the table at once and returns only once released.
   */
  holdNext(operation: Operation): () => void {
    const { promise, resolve } = Promise.withResolvers<void>();
    this.#held.set(operation, promise);
    return resolve;
  }

  async findAll(_options?: unknown) {
    // In the Product model's default order
    const rows = [...this.#rows.values()]
      .map((row) => structuredClone(row))
      .toSorted((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));
    await this.#release('read');
    return rows.map((row) => ({ toJSON: () => row }));
  }

  async add(data: ProductRow) {
    await this.#release('write');
    if (this.#rows.has(data.id)) {
      throw new Error(`Duplicate entry '${data.id}' for key 'products.PRIMARY'`);
    }
    this.#rows.set(data.id, structuredClone(data));
    await this.#release('reply');
  }

  async edit(data: ProductRow, { id }: { id: string }) {
    await this.#release('write');
    if (!this.#rows.has(id)) {
      throw new Error(`No product ${id}`);
    }
    this.#rows.set(id, structuredClone(data));
    await this.#release('reply');
  }

  async #release(operation: Operation) {
    const held = this.#held.get(operation);
    this.#held.delete(operation);
    await held;
  }
}
