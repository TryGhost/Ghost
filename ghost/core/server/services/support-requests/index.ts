import { defineService } from '../../../kernel/define-service';
import { SupportRequestsService } from './support-requests-service';

export type { SupportRequest } from './support-requests-service';

export default defineService('Support Requests', () => {
  const config = require('../../../shared/config');
  const logging = require('@tryghost/logging');
  const request = require('@tryghost/request');

  return new SupportRequestsService({ config, logging, request });
});
