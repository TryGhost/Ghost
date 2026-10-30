import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { IncorrectUsageError } from '@tryghost/errors';
import { defineService } from '../../../kernel/define-service';

// The renderer reads its HTML template on every send. The reader closes over this fixed
// map, so the renderer can read exactly these files and nothing else.
const TEMPLATE_FILES = {
  'new-comment': './email-templates/new-comment.hbs',
  'new-comment-reply': './email-templates/new-comment-reply.hbs',
  report: './email-templates/report.hbs',
} as const;

type TemplateName = keyof typeof TEMPLATE_FILES;

function readTemplate(name: TemplateName): Promise<string> {
  if (!Object.hasOwn(TEMPLATE_FILES, name)) {
    throw new IncorrectUsageError({
      message: `Unknown comment email template: ${String(name)}`,
    });
  }
  return readFile(path.join(__dirname, TEMPLATE_FILES[name]), 'utf8');
}

export default defineService('Comments', () => {
  const CommentsService = require('./comments-service');
  const CommentsController = require('./comments-controller');
  const CommentsStats = require('./comments-stats-service');

  const config = require('../../../shared/config');
  const logging = require('@tryghost/logging');
  const models = require('../../models');
  const { GhostMailer } = require('../../lib/mail');
  const settingsCache = require('../../../shared/settings-cache');
  const settingsHelpers = require('../settings-helpers');
  const urlService = require('../url');
  const urlUtils = require('../../../shared/url-utils').default;
  const membersService = require('../members');
  const db = require('../../data/db');
  const DomainEvents = require('@tryghost/domain-events');
  const { MemberCommentEvent } = require('../../../shared/events');
  const { byNQL } = require('../../models/base/plugins/bulk-filters');
  const { t } = require('../../../shared/i18n');
  const emailService = require('../email-service');

  const api = new CommentsService({
    config,
    logging,
    models,
    mailer: new GhostMailer(),
    settingsCache,
    settingsHelpers,
    urlService,
    urlUtils,
    contentGating: membersService.contentGating,
    DomainEvents,
    MemberCommentEvent,
    byNQL,
    t,
    // Email's renderer exists only once that service has initialized, which
    // happens alongside this one; resolve it when a reply notification is sent.
    createUnsubscribeUrl: (uuid: string, options: { comments: boolean }) =>
      emailService.renderer.createUnsubscribeUrl(uuid, options),
    readTemplate,
  });
  const controller = new CommentsController(api, new CommentsStats({ db }));

  return { api, controller };
});
