import { defineService } from '../../../kernel/define-service';
import urlUtils from '../../../shared/url-utils';
const urlService = require('../url');
const permissions = require('../permissions');
const AudienceFeedbackService = require('./audience-feedback-service');
const AudienceFeedbackController = require('./audience-feedback-controller');
const Feedback = require('./feedback');
const FeedbackRepository = require('./feedback-repository');

export default defineService('Audience Feedback', () => {
  const models = require('../../models');
  const repository = new FeedbackRepository({
    Member: models.Member,
    MemberFeedback: models.MemberFeedback,
    Feedback,
    Post: models.Post,
  });
  const service = new AudienceFeedbackService({
    urlService,
    config: {
      baseURL: new URL(urlUtils.urlFor('home', true)),
    },
  });
  const controller = new AudienceFeedbackController({
    repository,
    audienceFeedbackService: service,
    permissions,
  });

  return { repository, service, controller };
});
