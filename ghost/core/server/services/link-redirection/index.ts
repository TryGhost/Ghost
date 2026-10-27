import { IncorrectUsageError } from '@tryghost/errors';
import { defineService } from '../../../kernel/define-service';

// link-redirect-repository.js is CommonJS without declarations, so its instance type is
// opaque here; the consumers that borrow it are CommonJS too.
type LinkRedirectRepository = object;

let linkRedirectRepository: LinkRedirectRepository | undefined;

// Link tracking still reaches through for the repository to rebuild its post links.
// Narrowing it to the service API is a separate change, so the reach-through is transitional.
const extras = {
  linkRedirectRepository(): LinkRedirectRepository {
    if (linkRedirectRepository === undefined) {
      throw new IncorrectUsageError({
        message: 'Link redirection used before init(). Call init() from boot first.',
      });
    }
    return linkRedirectRepository;
  },
};

// Runs in the frontend services phase so the route mounts a ready handler and link tracking
// finds its repository. Models and the cache adapter are only available once boot reaches it.
export default defineService(
  'Link redirection',
  () => {
    const config = require('../../../shared/config');
    const urlUtils = require('../../../shared/url-utils').default;
    const adapterManager = require('../adapter-manager').default;
    const EventRegistry = require('../../lib/common/events');
    const DomainEvents = require('@tryghost/domain-events');
    const models = require('../../models');
    const LinkRedirectRepository = require('./link-redirect-repository');
    const LinkRedirectsService = require('./link-redirects-service');

    const repository: LinkRedirectRepository = new LinkRedirectRepository({
      LinkRedirect: models.Redirect,
      urlUtils,
      cacheAdapter: config.get('hostSettings:linkRedirectsPublicCache:enabled')
        ? adapterManager.getAdapter('cache:linkRedirectsPublic')
        : null,
      EventRegistry,
    });

    const service = new LinkRedirectsService({
      linkRedirectRepository: repository,
      DomainEvents,
      config: {
        baseURL: new URL(urlUtils.getSiteUrl()),
      },
    });

    linkRedirectRepository = repository;
    return service;
  },
  extras,
);
