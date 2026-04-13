const crypto = require('node:crypto');
const errors = require('@tryghost/errors');
const logging = require('@tryghost/logging');
const config = require('../../shared/config');
const settingsCache = require('../../shared/settings-cache');
const urlService = require('./url');
const events = require('../lib/common/events');

const X_AUTHORIZE_URL = 'https://api.x.com/oauth/authorize';
const X_REQUEST_TOKEN_URL = 'https://api.x.com/oauth/request_token';
const X_ACCESS_TOKEN_URL = 'https://api.x.com/oauth/access_token';
const X_CREATE_TWEET_URL = 'https://api.x.com/2/tweets';
const REQUEST_TIMEOUT_MS = 5000;

const defaultPostSlugs = [
    'welcome',
    'the-editor',
    'using-tags',
    'managing-users',
    'private-sites',
    'advanced-markdown',
    'themes',
    'coming-soon'
];

function percentEncode(value) {
    return encodeURIComponent(value).replace(/[!'()*]/g, character => `%${character.charCodeAt(0).toString(16).toUpperCase()}`);
}

function getConsumerCredentials() {
    const twitterConfig = config.get('twitter') || {};
    const consumerKey = twitterConfig.consumerKey;
    const consumerSecret = twitterConfig.consumerSecret;

    if (!consumerKey || !consumerSecret) {
        throw new errors.InternalServerError({
            message: 'X consumer credentials are not configured.'
        });
    }

    return {
        consumerKey,
        consumerSecret
    };
}

function buildBaseString({method, url, bodyParams = {}, oauthParams = {}}) {
    const requestUrl = new URL(url);
    const normalizedUrl = `${requestUrl.origin}${requestUrl.pathname}`;
    const allParams = [];

    requestUrl.searchParams.forEach((value, key) => {
        allParams.push([key, value]);
    });

    Object.entries(bodyParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            allParams.push([key, String(value)]);
        }
    });

    Object.entries(oauthParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
            allParams.push([key, String(value)]);
        }
    });

    const normalizedParams = allParams
        .map(([key, value]) => [percentEncode(key), percentEncode(value)])
        .sort(([leftKey, leftValue], [rightKey, rightValue]) => {
            if (leftKey === rightKey) {
                return leftValue.localeCompare(rightValue);
            }

            return leftKey.localeCompare(rightKey);
        })
        .map(([key, value]) => `${key}=${value}`)
        .join('&');

    return [
        method.toUpperCase(),
        percentEncode(normalizedUrl),
        percentEncode(normalizedParams)
    ].join('&');
}

function createOAuthAuthorizationHeader({method, url, token, tokenSecret, bodyParams}) {
    const {consumerKey, consumerSecret} = getConsumerCredentials();
    const oauthParams = {
        oauth_consumer_key: consumerKey,
        oauth_nonce: crypto.randomBytes(16).toString('hex'),
        oauth_signature_method: 'HMAC-SHA1',
        oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
        oauth_version: '1.0'
    };

    if (token) {
        oauthParams.oauth_token = token;
    }

    const baseString = buildBaseString({
        method,
        url,
        bodyParams,
        oauthParams
    });

    const signingKey = `${percentEncode(consumerSecret)}&${percentEncode(tokenSecret || '')}`;
    const oauthSignature = crypto.createHmac('sha1', signingKey).update(baseString).digest('base64');

    const headerParams = {
        ...oauthParams,
        oauth_signature: oauthSignature
    };

    return `OAuth ${Object.entries(headerParams)
        .sort(([leftKey], [rightKey]) => leftKey.localeCompare(rightKey))
        .map(([key, value]) => `${percentEncode(key)}="${percentEncode(value)}"`)
        .join(', ')}`;
}

async function requestFormEncoded({url, method, token, tokenSecret, bodyParams = {}}) {
    const response = await fetch(url, {
        method,
        headers: {
            Authorization: createOAuthAuthorizationHeader({method, url, token, tokenSecret, bodyParams}),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(bodyParams).toString(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    const responseText = await response.text();

    if (!response.ok) {
        throw new errors.InternalServerError({
            message: 'X authorization request failed.',
            context: responseText || response.statusText
        });
    }

    return Object.fromEntries(new URLSearchParams(responseText));
}

async function requestJson({url, method, token, tokenSecret, body}) {
    const response = await fetch(url, {
        method,
        headers: {
            Authorization: createOAuthAuthorizationHeader({method, url, token, tokenSecret}),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS)
    });

    const responseText = await response.text();
    const responseBody = responseText ? JSON.parse(responseText) : {};

    if (!response.ok) {
        throw new errors.InternalServerError({
            message: 'X publishing request failed.',
            context: responseBody.detail || response.statusText
        });
    }

    return responseBody;
}

function getTweetText(post) {
    const postUrl = urlService.getUrlByResourceId(post.id, {absolute: true});
    const title = post.title || '';
    const separatorLength = title ? 2 : 0;
    const maxTitleLength = Math.max(0, 280 - postUrl.length - separatorLength);

    if (!title) {
        return postUrl;
    }

    if (title.length <= maxTitleLength) {
        return `${title}\n\n${postUrl}`;
    }

    const truncatedTitle = maxTitleLength > 3 ? `${title.slice(0, maxTitleLength - 3)}...` : title.slice(0, maxTitleLength);
    return `${truncatedTitle}\n\n${postUrl}`;
}

async function createTweet(post) {
    const accessToken = settingsCache.get('x_access_token');
    const accessTokenSecret = settingsCache.get('x_access_token_secret');

    return requestJson({
        url: X_CREATE_TWEET_URL,
        method: 'POST',
        token: accessToken,
        tokenSecret: accessTokenSecret,
        body: {
            text: getTweetText(post)
        }
    });
}

async function publishPost(post) {
    const accessToken = settingsCache.get('x_access_token');
    const accessTokenSecret = settingsCache.get('x_access_token_secret');

    if (!accessToken || !accessTokenSecret) {
        return;
    }

    if (post.type === 'page') {
        return;
    }

    if (defaultPostSlugs.includes(post.slug)) {
        return;
    }

    if (post.x_post_enabled === false) {
        return;
    }

    try {
        await createTweet(post);
    } catch (error) {
        logging.error(error);
    }
}

function xListener(model, options) {
    if (options && options.importing) {
        return;
    }

    publishPost({
        ...model.toJSON(),
        authors: model.related('authors').toJSON()
    }).catch((error) => {
        logging.error(error);
    });
}

async function getAuthorizationUrl(setSessionProp) {
    const requestTokenData = await requestFormEncoded({
        url: X_REQUEST_TOKEN_URL,
        method: 'POST',
        bodyParams: {
            oauth_callback: 'oob'
        }
    });

    if (!requestTokenData.oauth_token || !requestTokenData.oauth_token_secret || requestTokenData.oauth_callback_confirmed !== 'true') {
        throw new errors.InternalServerError({
            message: 'X authorization could not be started.'
        });
    }

    setSessionProp('x_oauth_token', requestTokenData.oauth_token);
    setSessionProp('x_oauth_token_secret', requestTokenData.oauth_token_secret);

    return `${X_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(requestTokenData.oauth_token)}`;
}

async function getAccessTokenData({oauthVerifier, getSessionProp}) {
    const sessionToken = getSessionProp('x_oauth_token');
    const sessionTokenSecret = getSessionProp('x_oauth_token_secret');

    if (!sessionToken || !sessionTokenSecret) {
        throw new errors.ValidationError({
            message: 'X authorization session has expired. Please start the connection again.'
        });
    }

    const accessTokenData = await requestFormEncoded({
        url: X_ACCESS_TOKEN_URL,
        method: 'POST',
        token: sessionToken,
        tokenSecret: sessionTokenSecret,
        bodyParams: {
            oauth_verifier: oauthVerifier
        }
    });

    if (!accessTokenData.oauth_token || !accessTokenData.oauth_token_secret) {
        throw new errors.InternalServerError({
            message: 'X authorization could not be completed.'
        });
    }

    return accessTokenData;
}

function listen() {
    if (!events.hasRegisteredListener('post.published', 'xListener')) {
        events.on('post.published', xListener);
    }
}

module.exports = {
    listen,
    getAuthorizationUrl,
    getAccessTokenData
};
