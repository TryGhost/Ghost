import { Job } from '../../jobs-service/job';

export default class SendGiftRemindersJob extends Job {
  static type = 'send-gift-reminders';
}
