import { defineService } from '../../../kernel/define-service';
import { ExportRequestsService } from './export-requests-service';

export default defineService('Export Requests', () => {
  const config = require('../../../shared/config');
  const logging = require('@tryghost/logging');
  const request = require('@tryghost/request');

  return new ExportRequestsService({ config, logging, request });
});
