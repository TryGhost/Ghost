/**
 * The SDK's tooling, for Node: creating an app's keys, and signing and checking its manifest.
 * The `ghost-app` CLI and the Vite plugin are built on it.
 *
 * ```ts
 * import { createKeys, signProject } from '@tryghost/app-sdk/tooling';
 *
 * await createKeys({ root: '.', mode: 'development' });
 * const result = await signProject({
 *   root: '.',
 *   mode: 'development',
 *   manifestUrl: 'http://my-app.localhost:5173/ghost-app.json',
 * });
 * ```
 */

export { checkApp, type CheckCode, type CheckOptions, type CheckResult } from './check.ts';
export {
  BACKEND_KEY_VARIABLE,
  IDENTITY_KEY_VARIABLE,
  KEYS_DIRECTORY,
  createKeys,
  generateKey,
  keyFile,
  publicKeyOf,
  readBackendKey,
  readSigningKeys,
  type CreateKeysResult,
  type KeyName,
  type KeyOptions,
  type Mode,
  type PrivateKeyJwk,
  type PublicKeyJwk,
  type ReadKeysOptions,
  type SigningKeys,
} from './keys.ts';
export {
  MANIFEST_FILE,
  readManifestSource,
  signAppManifest,
  signProject,
  type SignOptions,
  type SignProjectOptions,
  type SignResult,
} from './sign.ts';
export { formatErrors } from './format.ts';
export type { AppManifest, ManifestError, ManifestSource, SignedManifest } from './types.ts';
