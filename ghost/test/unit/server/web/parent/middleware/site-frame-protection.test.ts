import assert from 'node:assert/strict';
import express from 'express';
import request from 'supertest';
import sinon from 'sinon';
import logging from '@tryghost/logging';
import configUtils from '../../../../../utils/config-utils';

// require, not import: the middleware must read the config instance that configUtils changes
const { createSiteFrameProtection } =
  require('../../../../../../core/server/web/parent/middleware/site-frame-protection') as typeof import('../../../../../../core/server/web/parent/middleware/site-frame-protection');

// The policy is worked out when the app is built, as at boot
function site() {
  const app = express();
  app.use(createSiteFrameProtection());
  app.get('/', (req, res) => {
    res.send('<!doctype html><title>Site</title>');
  });
  return app;
}

describe('Site frame protection middleware', function () {
  beforeEach(function () {
    configUtils.set('url', 'https://ghost.blog');
  });

  afterEach(async function () {
    sinon.restore();
    await configUtils.restore();
  });

  it('leaves framing alone unless switched on', async function () {
    const { headers } = await request(site()).get('/');
    assert(!('content-security-policy' in headers));
    assert(!('cross-origin-opener-policy' in headers));
  });

  it('lets only the site frame its pages while Admin shares its host', async function () {
    configUtils.set('siteFrameProtection', true);
    await request(site())
      .get('/')
      .expect('Content-Security-Policy', "frame-ancestors 'self'")
      .expect('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  });

  it('counts Admin on the same host but another protocol or port as sharing it, and lets Admin frame the site', async function () {
    configUtils.set('siteFrameProtection', true);
    configUtils.set('admin:url', 'http://ghost.blog');
    await request(site())
      .get('/')
      .expect('Content-Security-Policy', "frame-ancestors 'self' http://ghost.blog");

    configUtils.set('admin:url', 'https://ghost.blog:8443');
    await request(site())
      .get('/')
      .expect('Content-Security-Policy', "frame-ancestors 'self' https://ghost.blog:8443");
  });

  it('lets the sites it lists frame the site too, written with or without a trailing slash', async function () {
    configUtils.set('siteFrameProtection', [
      'https://partner.example/',
      '*.example.com',
      'localhost:3000',
    ]);
    await request(site())
      .get('/')
      .expect(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://partner.example *.example.com localhost:3000",
      )
      .expect('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  });

  it('reads a list given through environment variables, which arrives keyed by position', async function () {
    configUtils.set('siteFrameProtection', {
      1: 'https://second.example',
      0: 'https://first.example',
    });
    await request(site())
      .get('/')
      .expect(
        'Content-Security-Policy',
        "frame-ancestors 'self' https://first.example https://second.example",
      );
  });

  it("ignores list entries that aren't a site's address, so they can't widen or change the policy", async function () {
    const warn = sinon.stub(logging, 'warn');
    configUtils.set('siteFrameProtection', [
      '*',
      '*.com',
      'https:',
      "'none'",
      'https://partner.example/path',
      'https://partner.example; script-src *',
      42,
      'https://partner.example',
    ]);
    await request(site())
      .get('/')
      .expect('Content-Security-Policy', "frame-ancestors 'self' https://partner.example");
    assert(warn.calledWithMatch(/ignoring "\*\.com"/));
    assert(warn.calledWithMatch(/ignoring "https:"/));
    assert(warn.calledWithMatch(/ignoring 42/));
  });

  it('reads true and false given on the command line, which arrive as strings', async function () {
    configUtils.set('siteFrameProtection', 'false');
    const { headers } = await request(site()).get('/');
    assert(!('content-security-policy' in headers));

    configUtils.set('siteFrameProtection', 'true');
    await request(site()).get('/').expect('Content-Security-Policy', "frame-ancestors 'self'");

    configUtils.set('siteFrameProtection', 'FALSE');
    const { headers: upper } = await request(site()).get('/');
    assert(!('content-security-policy' in upper));
  });

  it('reads a single site as a list of one', async function () {
    configUtils.set('siteFrameProtection', 'https://single.example');
    await request(site())
      .get('/')
      .expect('Content-Security-Policy', "frame-ancestors 'self' https://single.example");
  });

  it("warns about a value that isn't true, false, a site or a list, and lets only the site frame it", async function () {
    const warn = sinon.stub(logging, 'warn');
    configUtils.set('siteFrameProtection', null);
    await request(site()).get('/').expect('Content-Security-Policy', "frame-ancestors 'self'");
    assert(warn.calledWithMatch(/null isn't true, false, a site or a list of sites/));
  });

  it('leaves framing alone when Admin has a host of its own', async function () {
    configUtils.set('siteFrameProtection', true);
    configUtils.set('admin:url', 'https://admin.ghost.blog');
    const { headers } = await request(site()).get('/');
    assert(!('content-security-policy' in headers));
    assert(!('cross-origin-opener-policy' in headers));
  });
});
