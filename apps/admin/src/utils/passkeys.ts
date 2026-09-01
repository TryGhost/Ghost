import { bufferToBase64URLString } from '@simplewebauthn/browser';
import { type User } from '@tryghost/admin-x-framework/api/users';

type PasskeyUserDetails = {
  rpId: string;
  userId: string;
  name: string;
  displayName: string;
};

type PublicKeyCredentialWithSignals = typeof PublicKeyCredential & {
  signalCurrentUserDetails?: (details: PasskeyUserDetails) => Promise<void>;
};

export async function signalStaffPasskeyUserDetails(user: User): Promise<boolean> {
  const publicKeyCredential = globalThis.PublicKeyCredential as
    | PublicKeyCredentialWithSignals
    | undefined;

  if (!user.id || !user.email || !publicKeyCredential?.signalCurrentUserDetails) {
    return false;
  }

  try {
    const encodedUserId = new TextEncoder().encode(user.id);
    await publicKeyCredential.signalCurrentUserDetails({
      rpId: globalThis.location.hostname,
      userId: bufferToBase64URLString(encodedUserId.buffer),
      name: user.email,
      displayName: user.name || user.email,
    });
    return true;
  } catch (error) {
    // Credential managers process account-update signals opportunistically.
    // A failed signal must never make a successfully saved profile look broken.
    return false;
  }
}
