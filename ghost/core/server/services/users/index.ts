import { defineService } from '../../../kernel/define-service';

/** Staff operations the ready instance exposes through `.service`. */
export interface UsersService {
  lockAll(frameOptions: {
    transacting?: unknown;
    [key: string]: unknown;
  }): Promise<{ count: number }>;
  assignTagToUserPosts(options: {
    id: string;
    context?: unknown;
    transacting?: unknown;
  }): Promise<void>;
  destroyUser(frameOptions: {
    id: string;
    context?: unknown;
    [key: string]: unknown;
  }): Promise<void>;
}

// Runs in the services phase: the users and authentication endpoints read the ready instance
// per request, and the update check may load the users endpoint before any Admin request.
export default defineService<UsersService>('Users', () => {
  const Users = require('./users-service');

  return new Users({
    models: require('../../models'),
    DomainEvents: require('@tryghost/domain-events'),
    PostsBulkAddTagsEvent: require('../../../shared/events-ts').PostsBulkAddTagsEvent,
    PostRevisions: require('../../lib/post-revisions').PostRevisions,
  });
});
