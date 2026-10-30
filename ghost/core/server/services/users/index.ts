import { defineService } from '../../../kernel/define-service';
import { UsersService } from './users-service';

// Runs in the services phase: the users and authentication endpoints read the ready instance
// per request, and the update check may load the users endpoint before any Admin request.
export default defineService('Users', () => {
  return new UsersService({
    models: require('../../models'),
    DomainEvents: require('@tryghost/domain-events'),
    PostsBulkAddTagsEvent: require('../../../shared/events-ts').PostsBulkAddTagsEvent,
    PostRevisions: require('../../lib/post-revisions').PostRevisions,
  });
});
