module.exports = class MilestoneQueries {
  #db;

  /** @type {number} */
  #minDaysSinceImported;

  constructor(deps) {
    this.#db = deps.db;
    this.#minDaysSinceImported = deps.minDaysSinceImported;
  }

  /**
   * @param {object} [options]
   * @param {object} [options.transacting]
   */
  #knex(options = {}) {
    return options.transacting || this.#db.knex;
  }

  /**
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<number>}
   */
  async getMembersCount(options) {
    const [membersCount] = await this.#knex(options)('members').count('id as count');

    return membersCount?.count || 0;
  }

  /**
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<Array>}
   */
  async getARR(options) {
    const currentARR = await this.#knex(options)('members_paid_subscription_events as stripe')
      .select(
        this.#db.knex.raw(
          'ROUND(SUM(stripe.mrr_delta) * 12) / 100 AS arr, stripe.currency as currency',
        ),
      )
      .groupBy('stripe.currency');

    return currentARR;
  }

  /**
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<boolean>}
   */
  async hasImportedMembersInPeriod(options) {
    const importedThreshold = new Date();
    importedThreshold.setDate(importedThreshold.getDate() - this.#minDaysSinceImported);

    const [hasImportedMembers] = await this.#knex(options)('members_subscribe_events')
      .count('id as count')
      .where('source', '=', 'import')
      .where('created_at', '>=', importedThreshold);

    return hasImportedMembers?.count > 0;
  }

  /**
   * @param {object} [options]
   * @param {object} [options.transacting]
   *
   * @returns {Promise<string>}
   */
  async getDefaultCurrency(options) {
    const currentARR = await this.getARR(options);

    // Set the default currency as the one with the highest value
    if (currentARR.length > 1) {
      const highestValues = currentARR.sort((a, b) => b.arr - a.arr);
      return highestValues?.[0]?.currency;
    } else if (currentARR?.[0]?.currency) {
      return currentARR[0].currency;
    } else {
      return 'usd';
    }
  }
};
