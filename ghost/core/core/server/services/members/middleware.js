const crypto = require('crypto');
const _ = require('lodash');
const logging = require('@tryghost/logging');
const membersService = require('./service');
const models = require('../../models');
const urlUtils = require('../../../shared/url-utils').default;
const spamPrevention = require('../../web/shared/middleware/api/spam-prevention');
const { formatNewsletterResponse } = require('./utils');
const errors = require('@tryghost/errors');
const tpl = require('@tryghost/tpl');
const onHeaders = require('on-headers');
const tiersService = require('../tiers/service');
const config = require('../../../shared/config');
const settingsHelpers = require('../settings-helpers');

const messages = {
  missingUuid: 'Missing uuid.',
  invalidUuid: 'Invalid uuid.',
  invalidKey: 'Invalid key.',
  // Says that nobody is signed in, without naming the cookie that would have said
  // so. Which cookie carries a session is Ghost's business, not the caller's.
  noMemberSession: 'You must be signed in to do this.',
};

const getFreeTier = async function getFreeTier() {
  const response = await tiersService.api.browse();
  const freeTier = response.data.find((tier) => tier.type === 'free');
  return freeTier;
};

/**
 * Sets the ghost-access and ghost-access-hmac cookies on the response object
 * @param {Object} member - The member object
 * @param {import('express').Request} req - The member object
 * @param {import('express').Response} res - The express response object to set the cookies on
 * @param {Object} freeTier - The free tier object
 * @returns
 */
const setAccessCookies = function setAccessCookies(member, req, res, freeTier) {
  if (!member) {
    // If there is no cookie sent with the request, return early
    if (!req.headers.cookie || !req.headers.cookie.includes('ghost-access')) {
      return;
    }
    // If there are cookies sent with the request, set them to null and expire them immediately
    const cookiePath = urlUtils.getSubdir() || '/';
    const accessCookie = `ghost-access=null; Max-Age=0; Path=${cookiePath}; HttpOnly; SameSite=Strict;`;
    const hmacCookie = `ghost-access-hmac=null; Max-Age=0; Path=${cookiePath}; HttpOnly; SameSite=Strict;`;
    const existingCookies = res.getHeader('Set-Cookie') || [];
    const cookiesToSet = [accessCookie, hmacCookie].concat(existingCookies);

    res.setHeader('Set-Cookie', cookiesToSet);
    return;
  }
  const hmacSecret = config.get('cacheMembersContent:hmacSecret');
  if (!hmacSecret) {
    return;
  }
  const hmacSecretBuffer = Buffer.from(hmacSecret, 'base64');
  if (hmacSecretBuffer.length === 0) {
    return;
  }
  const activeSubscription = member.subscriptions?.find((sub) => sub.status === 'active');

  const cookieTimestamp = Math.floor(Date.now() / 1000); // to mitigate a cookie replay attack
  const memberTier = (activeSubscription && activeSubscription.tier.id) || freeTier.id;
  const memberTierAndTimestamp = `${memberTier}:${cookieTimestamp}`;
  const memberTierHmac = crypto
    .createHmac('sha256', hmacSecretBuffer)
    .update(memberTierAndTimestamp)
    .digest('hex');

  const maxAge = 3600;
  const cookiePath = urlUtils.getSubdir() || '/';
  const accessCookie = `ghost-access=${memberTierAndTimestamp}; Max-Age=${maxAge}; Path=${cookiePath}; HttpOnly; SameSite=Strict;`;
  const hmacCookie = `ghost-access-hmac=${memberTierHmac}; Max-Age=${maxAge}; Path=${cookiePath}; HttpOnly; SameSite=Strict;`;

  const existingCookies = res.getHeader('Set-Cookie') || [];
  const cookiesToSet = [accessCookie, hmacCookie].concat(existingCookies);
  res.setHeader('Set-Cookie', cookiesToSet);
};

const accessInfoSession = async function accessInfoSession(req, res, next) {
  const freeTier = await getFreeTier();
  onHeaders(res, function () {
    setAccessCookies(req.member, req, res, freeTier);
  });
  next();
};

// @TODO: This piece of middleware actually belongs to the frontend, not to the member app
// Need to figure a way to separate these things (e.g. frontend actually talks to members API)
const loadMemberSession = async function loadMemberSession(req, res, next) {
  try {
    const member = await membersService.ssr.getMemberDataFromSession(req, res);
    Object.assign(req, { member });
    res.locals.member = req.member;
    next();
  } catch (err) {
    Object.assign(req, { member: null });
    next();
  }
};

const getRedirectUrl = function getRedirectUrl({ action, referrer, searchParams, success }) {
  const redirectUrl = new URL(referrer);

  searchParams.forEach((value, key) => {
    redirectUrl.searchParams.set(key, value);
  });
  redirectUrl.searchParams.set('success', String(success));

  if (action === 'signin') {
    // Not sure if we can delete this, this is a legacy param
    redirectUrl.searchParams.set('action', 'signin');
  }

  return redirectUrl.href;
};

/**
 * Establish who is signed in, without loading them.
 *
 * Sets `req.identity` to an id and an email address, or to null when nobody is
 * signed in. One lookup against an indexed column, with no relations attached and
 * nothing fetched from outside Ghost.
 *
 * Deliberately not the member's record. Most endpoints that serve a member need to
 * act on one rather than describe one, and the one that describes a member reads
 * it again after writing anyway, because the response has to say what Ghost now
 * holds rather than what was sent. What to load is the endpoint's own business.
 *
 * Distinct from `loadMemberSession`, which loads the whole member and is what a
 * themed page renders from.
 */
const loadMemberIdentity = async function loadMemberIdentity(req, res, next) {
  try {
    Object.assign(req, {
      identity: await membersService.ssr.getMemberIdentityFromSession(req, res),
    });
  } catch (err) {
    // Only a missing or unreadable cookie means nobody is signed in. Establishing
    // an identity also reaches the database, and answering "you are not signed in"
    // to that failing would tell a signed-in member something false and leave the
    // real fault unreported.
    if (!errors.utils.isGhostError(err) || err.errorType !== 'BadRequestError') {
      return next(err);
    }
    Object.assign(req, { identity: null });
  }

  return next();
};

/**
 * Hand the identity to whatever comes next, in the place the API framework reads.
 *
 * The framework takes whoever is acting from `req.member` and nowhere else, so a
 * controller behind either gate below finds the identity there.
 */
const carryIdentity = function carryIdentity(req, res) {
  Object.assign(req, { member: req.identity });
  res.locals.member = req.member;
};

/**
 * Refuse a request that `loadMemberIdentity` could not put a name to.
 *
 * For endpoints where an unknown caller is asking for something they have no right
 * to: changing a member's record, or reading what a publisher collects.
 *
 * Reads only `req.identity`, so a route using this must register
 * `loadMemberIdentity` first. It looks nothing up itself: what a route needs is
 * declared by the middleware it lists, rather than depending on what some earlier
 * one happened to leave behind.
 */
const rejectWhenAnonymous = function rejectWhenAnonymous(req, res, next) {
  if (!req.identity) {
    return next(
      new errors.UnauthorizedError({
        message: tpl(messages.noMemberSession),
      }),
    );
  }

  carryIdentity(req, res);
  return next();
};

/**
 * Answer with nothing when `loadMemberIdentity` could not put a name to the request.
 *
 * For reading who you are, where not knowing is an ordinary answer rather than a
 * failure: a themed page asks on every view and most of those views have no member.
 *
 * The counterpart to `rejectWhenAnonymous`, and separate from it because which of
 * the two applies is a fact about the endpoint, not a setting on a shared one.
 */
const emptyWhenAnonymous = function emptyWhenAnonymous(req, res, next) {
  if (!req.identity) {
    res.writeHead(204);
    return res.end();
  }

  carryIdentity(req, res);
  return next();
};

/**
 * Require member authentication, and make it possible to authenticate via uuid + hashed key.
 * You can chain this after loadMemberSession to make it possible to authenticate via both the uuid and the session.
 */
const authMemberByUuid = async function authMemberByUuid(req, res, next) {
  try {
    const uuid = req.query.uuid;
    if (!uuid) {
      if (res.locals.member && req.member) {
        // Already authenticated via session
        return next();
      }

      throw new errors.UnauthorizedError({
        message: tpl(messages.missingUuid),
      });
    }

    const key = req.query.key;
    if (!key) {
      throw new errors.UnauthorizedError({
        message: tpl(messages.invalidKey),
      });
    }

    // the request key is a hashed value from the member uuid and the members validation key so we can verify the source
    //  (only Ghost should be able to generate the key)
    const memberHmac = crypto
      .createHmac('sha256', settingsHelpers.getMembersValidationKey())
      .update(uuid)
      .digest('hex');
    if (memberHmac !== key) {
      throw new errors.UnauthorizedError({
        message: tpl(messages.invalidKey),
      });
    }

    const member = await membersService.api.memberBREADService.read({ uuid });
    if (!member) {
      throw new errors.UnauthorizedError({
        message: tpl(messages.invalidUuid),
      });
    }
    Object.assign(req, { member });
    res.locals.member = req.member;
    next();
  } catch (err) {
    next(err);
  }
};

const getIdentityToken = async function getIdentityToken(req, res) {
  try {
    const token = await membersService.ssr.getIdentityTokenForMemberFromSession(req, res);
    res.writeHead(200);
    res.end(token);
  } catch (err) {
    res.writeHead(204);
    res.end();
  }
};

const getEntitlementToken = async function getEntitlementToken(req, res) {
  try {
    const token = await membersService.ssr.getEntitlementTokenForMemberFromSession(req, res);
    res.writeHead(200);
    res.end(token);
  } catch (err) {
    res.writeHead(204);
    res.end();
  }
};

const createIntegrityToken = async function createIntegrityToken(req, res) {
  try {
    const token = membersService.requestIntegrityTokenProvider.create();
    res.writeHead(200);
    res.end(token);
  } catch (err) {
    res.writeHead(204);
    res.end();
  }
};

const verifyIntegrityToken = async function verifyIntegrityToken(req, res, next) {
  const shouldThrowForInvalidToken = config.get('verifyRequestIntegrity');
  try {
    const token = req.body.integrityToken;
    if (!token) {
      logging.warn('Request with missing integrity token.');
      if (shouldThrowForInvalidToken) {
        throw new errors.BadRequestError();
      } else {
        return next();
      }
    }
    if (membersService.requestIntegrityTokenProvider.validate(token)) {
      return next();
    } else {
      logging.warn('Request with invalid integrity token.');
      if (shouldThrowForInvalidToken) {
        throw new errors.BadRequestError();
      } else {
        return next();
      }
    }
  } catch (err) {
    next(err);
  }
};

const deleteSession = async function deleteSession(req, res) {
  try {
    await membersService.ssr.deleteSession(req, res);
    res.writeHead(204);
    res.end();
  } catch (err) {
    if (!err.statusCode) {
      logging.error(err);
    }
    res.writeHead(err.statusCode ?? 500, {
      'Content-Type': 'text/plain;charset=UTF-8',
    });
    res.end(err.message);
  }
};

const getMemberNewsletters = async function getMemberNewsletters(req, res) {
  try {
    const memberData = req.member; // validation assumed

    if (!memberData) {
      res.writeHead(404);
      return res.end('Email address not found.');
    }

    const data = _.pick(
      memberData,
      'uuid',
      'email',
      'name',
      'newsletters',
      'enable_comment_notifications',
      'enable_updates_and_announcements',
      'status',
    );

    if (data.newsletters) {
      data.newsletters = formatNewsletterResponse(data.newsletters);
    }

    return res.json(data);
  } catch (err) {
    res.writeHead(400);
    res.end('Failed to unsubscribe this email address');
  }
};

const updateMemberNewsletters = async function updateMemberNewsletters(req, res) {
  try {
    const memberData = req.member; // validation assumed
    if (!memberData) {
      res.writeHead(404);
      return res.end('Email address not found.');
    }

    const data = _.pick(
      req.body,
      'newsletters',
      'enable_comment_notifications',
      'enable_updates_and_announcements',
    );
    const options = {
      id: memberData.id,
      withRelated: ['newsletters'],
    };

    const updatedMember = await membersService.api.members.update(data, options);
    const updatedMemberData = _.pick(updatedMember.toJSON(), [
      'uuid',
      'email',
      'name',
      'newsletters',
      'enable_comment_notifications',
      'enable_updates_and_announcements',
      'status',
    ]);

    if (updatedMemberData.newsletters) {
      updatedMemberData.newsletters = formatNewsletterResponse(updatedMemberData.newsletters);
    }

    res.json(updatedMemberData);
  } catch (err) {
    res.writeHead(400);
    res.end('Failed to update newsletters');
  }
};

const createSessionFromMagicLink = async function createSessionFromMagicLink(req, res, next) {
  if (!req.url.includes('token=')) {
    return next();
  }

  // req.query is a plain object, copy it to a URLSearchParams object so we can call toString()
  const searchParams = new URLSearchParams('');
  Object.keys(req.query).forEach((param) => {
    // don't copy the "token", "r", or "otc_verification" params
    if (param !== 'token' && param !== 'r' && param !== 'otc_verification') {
      searchParams.set(param, req.query[param]);
    }
  });

  try {
    const member = await membersService.ssr.exchangeTokenForSession(req, res);
    spamPrevention.membersAuth().reset(req.ip, `${member.email}login`);
    // Note: don't reset 'member_login', or that would give an easy way around user enumeration by logging in to a manually created account
    const subscriptions = (member && member.subscriptions) || [];

    if (config.get('cacheMembersContent:enabled')) {
      // Set the ghost-access cookies to enable tier-based caching
      try {
        const freeTier = await getFreeTier();
        setAccessCookies(member, req, res, freeTier);
      } catch {
        // This is a non-critical operation, so we can safely ignore any errors
      }
    }

    const action = req.query.action;

    if (action === 'signup' || action === 'signup-paid' || action === 'subscribe') {
      let customRedirect = '';
      const mostRecentActiveSubscription = subscriptions
        .sort((a, b) => {
          const aStartDate = new Date(a.start_date);
          const bStartDate = new Date(b.start_date);
          return bStartDate.valueOf() - aStartDate.valueOf();
        })
        .find((sub) => ['active', 'trialing'].includes(sub.status));
      if (mostRecentActiveSubscription) {
        customRedirect = mostRecentActiveSubscription.tier.welcome_page_url;
      } else {
        const freeTier = await models.Product.findOne({ type: 'free' });
        customRedirect = (freeTier && freeTier.get('welcome_page_url')) || '';
      }

      if (customRedirect && customRedirect !== '/') {
        const baseUrl = urlUtils.getSiteUrl();
        const ensureEndsWith = (string, endsWith) =>
          string.endsWith(endsWith) ? string : string + endsWith;
        const removeLeadingSlash = (string) => string.replace(/^\//, '');

        // Add query parameters so the frontend can detect that the signup went fine

        const redirectUrl = new URL(
          removeLeadingSlash(ensureEndsWith(customRedirect, '/')),
          ensureEndsWith(baseUrl, '/'),
        );

        if (urlUtils.isSiteUrl(redirectUrl)) {
          // Add only for non-external URLs
          redirectUrl.searchParams.set('success', 'true');
          redirectUrl.searchParams.set('action', 'signup');
        }

        return res.redirect(redirectUrl.href);
      }
    }

    const referrer = req.query.r;
    const siteUrl = urlUtils.getSiteUrl();
    if (referrer && referrer.startsWith(siteUrl)) {
      const redirectUrl = getRedirectUrl({ action, referrer, searchParams, success: true });
      return res.redirect(redirectUrl);
    }

    // Do a standard 302 redirect to the homepage, with success=true
    searchParams.set('success', 'true');
    res.redirect(`${urlUtils.getSubdir()}/?${searchParams.toString()}`);
  } catch (err) {
    logging.warn(err.message);

    if (err.code && typeof err.code === 'string') {
      searchParams.set('errorCode', err.code);
    }

    const referrer = req.query.r;
    const siteUrl = urlUtils.getSiteUrl();
    if (referrer && referrer.startsWith(siteUrl)) {
      const redirectUrl = getRedirectUrl({
        action: req.query.action,
        referrer,
        searchParams,
        success: false,
      });
      return res.redirect(redirectUrl);
    }

    // Do a standard 302 redirect to the homepage, with success=false
    searchParams.set('success', false);
    res.redirect(`${urlUtils.getSubdir()}/?${searchParams.toString()}`);
  }
};

// Set req.member & res.locals.member if a cookie is set
module.exports = {
  loadMemberSession,
  loadMemberIdentity,
  rejectWhenAnonymous,
  emptyWhenAnonymous,
  authMemberByUuid,
  createSessionFromMagicLink,
  getIdentityToken,
  getEntitlementToken,
  getMemberNewsletters,
  updateMemberNewsletters,
  deleteSession,
  accessInfoSession,
  createIntegrityToken,
  verifyIntegrityToken,
};
