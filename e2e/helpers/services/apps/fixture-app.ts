import express from 'express';
import path from 'node:path';
import { CHALLENGE_PATH, handleChallenge } from '@tryghost/app-sdk/backend';
import { FakeServer } from '@/helpers/services/fake-server';
import { type PrivateKeyJwk, generateKey, signAppManifest } from '@tryghost/app-sdk/tooling';
import { REPO_ROOT } from '@/helpers/environment/constants';
import { readFileSync } from 'node:fs';

/** The test ID of the element where the fixture app's page shows the path it was served from. */
export const FIXTURE_APP_PATH_TEST_ID = 'fixture-app-path';

/**
 * The app SDK's browser bundle, as `pnpm nx run @tryghost/app-sdk:build` writes it. The fixture
 * imports the SDK's tooling and backend as built too, as an app would.
 */
const APP_SDK_BUNDLE = path.join(REPO_ROOT, 'packages/app-sdk/dist/app-sdk.js');

/**
 * The manifest the fixture app serves, before the SDK's tooling adds its manifest URL and keys and
 * signs it, as an app's `ghost-app.json`. Its fields follow `@tryghost/app-contracts`' manifest.
 */
export interface FixtureAppManifest {
  id: string;
  name: string;
  description: string;
  author: { name: string; url: string };
  accent_color: string;
  icon: { name: string };
  surfaces: [{ type: 'admin_page'; url: string }];
}

/**
 * The fixture app's page script. It connects with the app SDK as an app would. Its button calls
 * the Admin API with `ghost.fetch` and shows the response's status and body, or the SDK's error as
 * its code and message, as in `blocked: …`.
 */
const PAGE_SCRIPT = `
import { connect } from '@tryghost/app-sdk';

document.querySelector('[data-testid=${JSON.stringify(FIXTURE_APP_PATH_TEST_ID)}]').textContent = location.pathname;

const connecting = connect();
const path = document.querySelector('input');
const result = document.querySelector('output');

document.querySelector('button').addEventListener('click', async () => {
  result.textContent = 'Calling ' + path.value;
  try {
    const response = await (await connecting).fetch(path.value);
    result.textContent = response.status + ' ' + (await response.text());
  } catch (error) {
    result.textContent = error.code + ': ' + error.message;
  }
});
`;

/**
 * The fixture app's page, with an import map that resolves `@tryghost/app-sdk` to the SDK's bundle.
 *
 * The bundle is inlined as a data URL because the frame can't fetch it from the fixture's server:
 * the tests' browser context sends Admin's `Origin` with every request, and Chromium refuses any
 * request from the frame, a script or an image, whose `Origin` isn't the frame's own.
 */
function pageHtml(appSdkBundle: string): string {
  const importMap = {
    imports: {
      '@tryghost/app-sdk': `data:text/javascript;base64,${Buffer.from(appSdkBundle).toString('base64')}`,
    },
  };
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Fixture app</title>
<script type="importmap">${JSON.stringify(importMap)}</script>
</head>
<body>
<h1>Fixture app</h1>
<p>Served from <code data-testid="${FIXTURE_APP_PATH_TEST_ID}"></code></p>
<label>Admin API path <input value="/posts/"></label>
<button type="button">Call the Admin API</button>
<output></output>
<script type="module">${PAGE_SCRIPT}</script>
</body>
</html>`;
}

/** Reads the app SDK's bundle, which `pnpm test` builds first. */
function readAppSdkBundle(): string {
  try {
    return readFileSync(APP_SDK_BUNDLE, 'utf8');
  } catch (error) {
    throw new Error(
      `The fixture app needs the app SDK's bundle, ${APP_SDK_BUNDLE}. Build it with \`pnpm nx run @tryghost/app-sdk:build\`.`,
      { cause: error },
    );
  }
}

/**
 * A small app for the apps E2E tests. It serves its manifest, which a test can change between
 * steps the way a developer would redeploy, and an Admin page that connects to Admin and has a
 * button that calls the Admin API.
 *
 * The page URL in the manifest is relative to the manifest, and every path ending in `.html` serves
 * the page, which shows the path it was served from. A second fixture app with the same ID is the
 * same app served from another host, as when a developer's tunnel URL changes, as long as it's
 * given the first one's identity key.
 *
 * The page uses the app SDK as built from the checkout, so the SDK must be built first, which
 * `pnpm test` does.
 *
 * It signs its manifest with its identity key using the SDK's tooling, as a development build, and
 * answers Ghost's challenge with its backend key using the SDK's backend, as an app would. Ghost in
 * development trusts localhost without the challenge, so only the signature is checked today.
 */
export class FixtureApp extends FakeServer {
  manifest: FixtureAppManifest;
  /** The private key the app signs its manifest with, which Ghost pins at install. */
  readonly identityKey: PrivateKeyJwk;
  private readonly backendKey: PrivateKeyJwk;
  private readonly pageHtml: string;

  constructor({
    appId,
    name = 'Fixture App',
    identityKey = generateKey(),
  }: {
    appId: string;
    name?: string;
    identityKey?: PrivateKeyJwk;
  }) {
    super({ debugNamespace: 'e2e:fixture-app' });
    this.pageHtml = pageHtml(readAppSdkBundle());
    this.identityKey = identityKey;
    this.backendKey = generateKey();
    this.manifest = {
      id: appId,
      name,
      description: 'An app the E2E tests install.',
      author: { name: 'Ghost E2E', url: 'https://ghost.org/' },
      accent_color: '#15171a',
      icon: { name: 'blocks' },
      surfaces: [{ type: 'admin_page', url: 'app.html' }],
    };
  }

  get origin(): string {
    return `http://localhost:${this.port}`;
  }

  get manifestUrl(): string {
    return `${this.origin}/manifest.json`;
  }

  /** Changes what the manifest URL serves from now on, as a redeploy of the app would. */
  updateManifest(changes: Partial<FixtureAppManifest>): void {
    this.manifest = { ...this.manifest, ...changes };
  }

  /** Points the app's Admin page at another path, relative to the manifest. */
  setPageUrl(url: string): void {
    this.updateManifest({ surfaces: [{ type: 'admin_page', url }] });
  }

  protected setupRoutes(): void {
    this.app.get('/manifest.json', (_req, res, next) => {
      signAppManifest(this.manifest, {
        manifestUrl: this.manifestUrl,
        identityKey: this.identityKey,
        backendKey: this.backendKey,
        development: true,
      })
        .then((result) => {
          if (!result.success) {
            throw new Error(
              `The fixture app's manifest can't be signed: ${JSON.stringify(result.errors)}`,
            );
          }
          res.json(result.signed);
        })
        .catch(next);
    });

    this.app.post(CHALLENGE_PATH, express.raw({ type: '*/*' }), (req, res, next) => {
      // As the platform would hand the request to the app's backend.
      const request = new Request(`${req.protocol}://${req.get('host')}${req.originalUrl}`, {
        method: req.method,
        body: Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : undefined,
      });
      handleChallenge(request, { backendKey: this.backendKey })
        .then(async (response) => {
          res
            .status(response.status)
            .type('json')
            .send(await response.text());
        })
        .catch(next);
    });

    this.app.get(/\.html$/, (_req, res) => {
      res.type('html').send(this.pageHtml);
    });
  }
}
