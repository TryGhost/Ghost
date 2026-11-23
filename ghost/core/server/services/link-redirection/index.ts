import { IncorrectUsageError } from '@tryghost/errors';
import { defineService, legacyEvent } from '../../../../bootstrap/transition/define-service';

// link-redirect-repository.js is CommonJS without declarations, so only what this root calls is
// described here; the consumers that borrow it are CommonJS too.
type LinkRedirectRepository = { resetCache(): void };

// link-redirects-service.js is CommonJS without declarations.
type LinkRedirectsService = object;

// The repository each service was built with. Kept beside the instance, not in a variable, so
// that it is the repository of whichever instance is asked about.
const repositories = new WeakMap<LinkRedirectsService, LinkRedirectRepository>();

function repositoryOf(service: LinkRedirectsService): LinkRedirectRepository {
  const repository = repositories.get(service);
  if (repository === undefined) {
    throw new IncorrectUsageError({
      message: 'This link redirection service was not built by its service root.',
    });
  }
  return repository;
}

// Link tracking still reaches through for the repository to rebuild its post links.
// Narrowing it to the service API is a separate change, so the reach-through is transitional.
const extras = {
  linkRedirectRepository(): LinkRedirectRepository {
    return repositoryOf(linkRedirection.service);
  },
};

// The route mounts its handler and link tracking finds its repository through this root. Models
// and the cache adapter are only available once boot allows services to be built.
const linkRedirection = defineService(
  'Link redirection',
  {
    create: (): LinkRedirectsService => {
      const config = require('../../../shared/config');
      const urlUtils = require('../../../shared/url-utils').default;
      const adapterManager = require('../adapter-manager').default;
      const DomainEvents = require('@tryghost/domain-events');
      const models = require('../../models');
      const LinkRedirectRepository = require('./link-redirect-repository');
      const LinkRedirectsService = require('./link-redirects-service');

      const baseURL = new URL(urlUtils.getSiteUrl());
      const repository: LinkRedirectRepository = new LinkRedirectRepository({
        LinkRedirect: models.Redirect,
        urlUtils,
        cacheAdapter: config.get('hostSettings:linkRedirectsPublicCache:enabled')
          ? adapterManager.getAdapter('cache:linkRedirectsPublic')
          : null,
      });
      const service: LinkRedirectsService = new LinkRedirectsService({
        linkRedirectRepository: repository,
        DomainEvents,
        config: {
          baseURL,
        },
      });

      repositories.set(service, repository);
      return service;
    },
    // Any change to the site can change where a link redirects to.
    listeners: [
      {
        event: legacyEvent('site.changed'),
        handle: (service) => repositoryOf(service).resetCache(),
      },
    ],
  },
  extras,
);

export default linkRedirection;
