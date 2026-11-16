'use strict';

// Where a service root can live. Every service check reads this file, so a root
// that moves between homes keeps the same checks.
//
//   ghost/core/server/services/<name>/                       the original home
//   ghost/domains/<domain>/transition/services/<name>/       moved into a domain, not reshaped
//   ghost/domains/<domain>/services/<name>/                  reshaped: a root started by the domain layer
//
// The first two are "boot-owned": boot.js binds the root and awaits its init().
// A reshaped root is started by the domain layer and has its own import rules.
const servicesRoot = 'ghost/core/server/services';
const domainsRoot = 'ghost/domains';
const transitionServices = `${domainsRoot}/[^/]+/transition/services`;
const reshapedServices = `${domainsRoot}/[^/]+/services`;

// Regular-expression sources without anchors, for composing into rules.
const bootOwnedServiceHomes = `(?:${servicesRoot}|${transitionServices})`;
const allServiceHomes = `(?:${servicesRoot}|${transitionServices}|${reshapedServices})`;

module.exports = {
  servicesRoot,
  domainsRoot,
  bootOwnedServiceHomes,
  allServiceHomes,
  reshapedServices,
};
