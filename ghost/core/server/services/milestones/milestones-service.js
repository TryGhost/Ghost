const Milestone = require('./milestone');

/**
 * @typedef {object} Options
 * @prop {object} [transacting]
 */

/**
 * @typedef {object} IMilestoneRepository
 * @prop {<T>(fn: (transacting: object) => Promise<T>) => Promise<T>} transaction
 * @prop {(transacting: object) => Promise<void>} lockChecks
 * @prop {(milestone: Milestone, [options]: Options) => Promise<void>} save
 * @prop {(arr: number, [currency]: string|null, [options]: Options) => Promise<Milestone>} getByARR
 * @prop {(count: number, [options]: Options) => Promise<Milestone>} getByCount
 * @prop {(type: 'arr'|'members', [currency]: string|null, [options]: Options) => Promise<Milestone>} getLatestByType
 * @prop {([options]: Options) => Promise<Milestone>} getLastEmailSent
 * @prop {(type: 'arr'|'members', [currency]: string|null, [options]: Options) => Promise<Milestone[]>} getAllByType
 */

/**
 * @typedef {object} IQueries
 * @prop {([options]: Options) => Promise<number>} getMembersCount
 * @prop {([options]: Options) => Promise<object>} getARR
 * @prop {([options]: Options) => Promise<boolean>} hasImportedMembersInPeriod
 * @prop {([options]: Options) => Promise<string>} getDefaultCurrency
 */

/**
 * @typedef {object} milestonesConfig
 * @prop {Array<object>} milestonesConfig.arr
 * @prop {string} milestonesConfig.arr.currency
 * @prop {number[]} milestonesConfig.arr.values
 * @prop {number[]} milestonesConfig.members
 * @prop {number} milestonesConfig.minDaysSinceLastEmail
 */

module.exports = class MilestonesService {
  /** @type {IMilestoneRepository} */
  #repository;

  /**
   * @type {milestonesConfig} */
  #milestonesConfig;

  /** @type {IQueries} */
  #queries;

  /**
   * @param {object} deps
   * @param {IMilestoneRepository} deps.repository
   * @param {milestonesConfig} deps.milestonesConfig
   * @param {IQueries} deps.queries
   */
  constructor(deps) {
    this.#milestonesConfig = deps.milestonesConfig;
    this.#queries = deps.queries;
    this.#repository = deps.repository;
  }

  /**
   * @param {string} [currency]
   * @param {Options} [options]
   *
   * @returns {Promise<Milestone>}
   */
  async #getLatestArrMilestone(currency = 'usd', options) {
    return this.#repository.getLatestByType('arr', currency, options);
  }

  /**
   * @param {Options} options
   *
   * @returns {Promise<Milestone>}
   */
  async #getLatestMembersCountMilestone(options) {
    return this.#repository.getLatestByType('members', null, options);
  }

  /**
   * @param {Options} options
   *
   * @returns {Promise<string>}
   */
  async #getDefaultCurrency(options) {
    return await this.#queries.getDefaultCurrency(options);
  }

  /**
   * @param {object} milestone
   * @param {'arr'|'members'} milestone.type
   * @param {number} milestone.value
   * @param {string} milestone.currency
   * @param {Options} options
   *
   * @returns {Promise<boolean>}
   */
  async #checkMilestoneExists(milestone, options) {
    let foundExistingMilestone = false;
    let existingMilestone = null;

    if (milestone.type === 'arr') {
      existingMilestone =
        (await this.#repository.getByARR(milestone.value, milestone.currency, options)) || false;
    } else if (milestone.type === 'members') {
      existingMilestone = (await this.#repository.getByCount(milestone.value, options)) || false;
    }

    foundExistingMilestone = existingMilestone ? true : false;

    return foundExistingMilestone;
  }

  /**
   * @param {object} milestone
   * @param {'arr'|'members'} milestone.type
   * @param {number} milestone.value
   * @param {Options} options
   *
   * @returns {Promise<Milestone>}
   */
  async #createMilestone(milestone, options) {
    const newMilestone = await Milestone.create(milestone);

    await this.#repository.save(newMilestone, options);
    return newMilestone;
  }

  /**
   *
   * @param {number[]} goalValues
   * @param {number} current
   *
   * @returns {number[]}
   */
  #getMatchedMilestones(goalValues, current) {
    // return all achieved milestones and sort by value ascending
    return goalValues.filter((value) => current >= value).sort((a, b) => a - b);
  }

  /**
   *
   * @param {object} milestone
   * @param {number} milestone.value
   * @param {'arr'|'members'} milestone.type
   * @param {object} milestone.meta
   * @param {string|null} [milestone.currency]
   * @param {Date|null} [milestone.emailSentAt]
   * @param {Options} options
   *
   * @returns {Promise<Milestone>}
   */
  async #saveMileStoneAndSendEmail(milestone, options) {
    const { shouldSendEmail, reason } = await this.#shouldSendEmail(options);

    if (shouldSendEmail) {
      milestone.emailSentAt = new Date();
    }

    if (reason) {
      milestone.meta.reason = reason;
    }

    return await this.#createMilestone(milestone, options);
  }

  /**
   * @param {object} milestone
   * @param {number} milestone.value
   * @param {'arr'|'members'} milestone.type
   * @param {object} milestone.meta
   * @param {string|null} [milestone.currency]
   * @param {Date|null} [milestone.emailSentAt]
   * @param {Options} options
   *
   * @returns {Promise<Milestone>}
   */
  async #saveMileStoneWithoutEmail(milestone, options) {
    return await this.#createMilestone(milestone, options);
  }

  /**
   * @param {Options} options
   *
   * @returns {Promise<{shouldSendEmail: boolean, reason: string}>}
   */
  async #shouldSendEmail(options) {
    let emailTooSoon = false;
    let reason = null;
    // Two cases in which we don't want to send an email
    // 1. There has been an import of members within the last week
    // 2. The last email has been sent less than two weeks ago
    const lastMilestoneSent = await this.#repository.getLastEmailSent(options);

    if (lastMilestoneSent) {
      const differenceInTime =
        new Date().getTime() - new Date(lastMilestoneSent.emailSentAt).getTime();
      const differenceInDays = differenceInTime / (1000 * 3600 * 24);

      emailTooSoon = differenceInDays <= this.#milestonesConfig.minDaysSinceLastEmail;
    }

    const hasMembersImported = await this.#queries.hasImportedMembersInPeriod(options);
    const shouldSendEmail = !emailTooSoon && !hasMembersImported;

    if (!shouldSendEmail) {
      reason = hasMembersImported ? 'import' : 'email';
    }

    return { shouldSendEmail, reason };
  }

  /**
   * @param {Options} options
   *
   * @returns {Promise<Milestone>}
   */
  async #runARRQueries(options) {
    // Fetch the current data from queries
    const currentARR = await this.#queries.getARR(options);
    const defaultCurrency = await this.#getDefaultCurrency(options);

    // Check the definitions in the milestonesConfig
    const arrMilestoneSettings = this.#milestonesConfig.arr;
    const supportedCurrencies = arrMilestoneSettings.map((setting) => setting.currency);

    // First check the currency matches
    if (currentARR.length) {
      const currentARRForCurrency = currentARR.filter(
        (arr) => arr.currency === defaultCurrency && supportedCurrencies.includes(defaultCurrency),
      )[0];
      const milestonesForCurrency = arrMilestoneSettings.filter(
        (milestoneSetting) => milestoneSetting.currency === defaultCurrency,
      )[0];

      if (milestonesForCurrency && currentARRForCurrency) {
        // get all milestones that have been achieved
        const achievedMilestones = this.#getMatchedMilestones(
          milestonesForCurrency.values,
          currentARRForCurrency.arr,
        );

        // check for previously achieved milestones. We do not send an email when no
        // previous milestones exist
        const allMilestonesForCurrency = await this.#repository.getAllByType(
          'arr',
          defaultCurrency,
          options,
        );
        const isInitialRun = !allMilestonesForCurrency || allMilestonesForCurrency?.length === 0;
        const highestAchievedMilestone = Math.max(...achievedMilestones);

        if (achievedMilestones && achievedMilestones.length) {
          for await (const milestone of achievedMilestones) {
            // Fetch the latest milestone for this currency
            const latestMilestone = await this.#getLatestArrMilestone(defaultCurrency, options);

            // Ensure the milestone doesn't already exist
            const milestoneExists = await this.#checkMilestoneExists(
              {
                value: milestone,
                type: 'arr',
                currency: defaultCurrency,
              },
              options,
            );

            if (!milestoneExists) {
              if (isInitialRun) {
                // No milestones have been saved yet, don't send an email
                // for the first initial run
                const meta = {
                  currentValue: currentARRForCurrency.arr,
                  reason: 'initial',
                };
                await this.#saveMileStoneWithoutEmail(
                  {
                    value: milestone,
                    type: 'arr',
                    currency: defaultCurrency,
                    meta,
                  },
                  options,
                );
              } else if (
                (latestMilestone && milestone <= latestMilestone?.value) ||
                milestone < highestAchievedMilestone
              ) {
                // The highest achieved milestone is higher than the current on hand.
                // Do not send an email, but save it.
                const meta = {
                  currentValue: currentARRForCurrency.arr,
                  reason: 'skipped',
                };
                await this.#saveMileStoneWithoutEmail(
                  {
                    value: milestone,
                    type: 'arr',
                    currency: defaultCurrency,
                    meta,
                  },
                  options,
                );
              } else if (!latestMilestone || milestone > latestMilestone.value) {
                const meta = {
                  currentValue: currentARRForCurrency.arr,
                };
                await this.#saveMileStoneAndSendEmail(
                  {
                    value: milestone,
                    type: 'arr',
                    currency: defaultCurrency,
                    meta,
                  },
                  options,
                );
              }
            }
          }
        }
        return await this.#getLatestArrMilestone(defaultCurrency, options);
      }
    }
  }

  /**
   * @param {Options} options
   *
   * @returns {Promise<Milestone>}
   */
  async #runMemberQueries(options) {
    // Fetch the current data
    const membersCount = await this.#queries.getMembersCount(options);

    // Check the definitions in the milestonesConfig
    const membersMilestones = this.#milestonesConfig.members;

    // get the closest milestone we're over now
    const achievedMilestones = this.#getMatchedMilestones(membersMilestones, membersCount);

    // check for previously achieved milestones. We do not send an email when no
    // previous milestones exist
    const allMembersMilestones = await this.#repository.getAllByType('members', null, options);
    const isInitialRun = !allMembersMilestones || allMembersMilestones?.length === 0;
    const highestAchievedMilestone = Math.max(...achievedMilestones);

    if (achievedMilestones && achievedMilestones.length) {
      for await (const milestone of achievedMilestones) {
        // Fetch the latest achieved Members milestones
        const latestMembersMilestone = await this.#getLatestMembersCountMilestone(options);

        // Ensure the milestone doesn't already exist
        const milestoneExists = await this.#checkMilestoneExists(
          {
            value: milestone,
            type: 'members',
            currency: null,
          },
          options,
        );

        if (!milestoneExists) {
          if (isInitialRun) {
            // No milestones have been saved yet, don't send an email
            // for the first initial run
            const meta = {
              currentValue: membersCount,
              reason: 'initial',
            };
            await this.#saveMileStoneWithoutEmail(
              { value: milestone, type: 'members', meta },
              options,
            );
          } else if (
            (latestMembersMilestone && milestone <= latestMembersMilestone?.value) ||
            milestone < highestAchievedMilestone
          ) {
            // The highest achieved milestone is higher than the current on hand.
            // Do not send an email, but save it.
            const meta = {
              currentValue: membersCount,
              reason: 'skipped',
            };
            await this.#saveMileStoneWithoutEmail(
              { value: milestone, type: 'members', meta },
              options,
            );
          } else if (!latestMembersMilestone || milestone > latestMembersMilestone.value) {
            const meta = {
              currentValue: membersCount,
            };
            await this.#saveMileStoneAndSendEmail(
              { value: milestone, type: 'members', meta },
              options,
            );
          }
        }
      }
      return await this.#getLatestMembersCountMilestone(options);
    }
  }

  /**
   * @param {'arr'|'members'} type
   *
   * @returns {Promise<Milestone>}
   */
  async checkMilestones(type) {
    return await this.#repository.transaction(async (transacting) => {
      await this.#repository.lockChecks(transacting);

      if (type === 'arr') {
        return await this.#runARRQueries({ transacting });
      }

      return await this.#runMemberQueries({ transacting });
    });
  }
};
