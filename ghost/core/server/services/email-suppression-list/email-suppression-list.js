const assert = require('node:assert/strict');

/**
 * @typedef {object} EmailSuppressionInfo
 * @prop {'spam' | 'failed'} reason
 * @prop {Date} timestamp
 */

/**
 * @typedef {object} EmailSuppressedData
 * @prop {true} suppressed
 * @prop {EmailSuppressionInfo} info
 */

/**
 * @typedef {object} EmailNotSuppressedData
 * @prop {false} suppressed
 * @prop {null} info
 */

/**
 * @typedef {EmailSuppressedData | EmailNotSuppressedData} IEmailSuppressionData
 */

/**
 * @typedef {object} IEmailSuppressionList
 * @prop {(email: string) => Promise<EmailSuppressionData>} getSuppressionData
 * @prop {(emails: string[]) => Promise<EmailSuppressionData[]>} getBulkSuppressionData
 * @prop {(email: string) => Promise<boolean>} removeEmail
 */

/**
 * @implements {IEmailSuppressionData}
 */
class EmailSuppressionData {
  /** @type {boolean} */
  suppressed;
  /** @type {EmailSuppressionInfo | null} */
  info;

  constructor(suppressed, info) {
    if (!suppressed) {
      this.suppressed = false;
      this.info = null;
    } else {
      this.suppressed = true;
      assert(info.reason === 'spam' || info.reason === 'fail');
      assert(info.timestamp instanceof Date);
      this.info = {
        reason: info.reason,
        timestamp: info.timestamp,
      };
    }
  }
}

class EmailSuppressedEvent {
  /**
   * @readonly
   * @type {{emailId: string, emailAddress: string, reason: string}}
   */
  data;

  /**
   * @readonly
   * @type {Date}
   */
  timestamp;

  /**
   * @private
   */
  constructor({ emailAddress, emailId, reason, timestamp }) {
    this.data = {
      emailAddress,
      emailId,
      reason,
    };
    this.timestamp = timestamp;
  }

  static create(data, timestamp) {
    return new EmailSuppressedEvent({
      ...data,
      timestamp: timestamp || new Date(),
    });
  }
}

module.exports = {
  EmailSuppressionData,
  EmailSuppressedEvent,
};
