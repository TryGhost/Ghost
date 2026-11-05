// What the backend, the tooling and the Vite plugin agree on about the signed manifest. Free of
// Node and of the contracts' validation, as the backend runs on any platform.

/** Where an app serves its signed manifest by convention, and where the SDK's tooling signs it for. */
export const MANIFEST_PATH = '/ghost-app.json';

/** A signed manifest: flattened JWS JSON, as `ghost-app sign` or the Vite plugin writes it. */
export interface SignedManifest {
  protected: string;
  payload: string;
  signature: string;
}
