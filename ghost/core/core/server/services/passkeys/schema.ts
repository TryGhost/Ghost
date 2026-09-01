import type {
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
  RegistrationResponseJSON,
} from '@simplewebauthn/server';
import { z } from 'zod';

const base64Url = z.string().min(1);
const authenticatorAttachment = z.enum(['cross-platform', 'platform']);
const authenticatorTransport = z.enum([
  'ble',
  'cable',
  'hybrid',
  'internal',
  'nfc',
  'smart-card',
  'usb',
]);
const clientExtensionResults = z
  .object({
    appid: z.boolean().optional(),
    credProps: z.object({ rk: z.boolean().optional() }).optional(),
    hmacCreateSecret: z.boolean().optional(),
  })
  .passthrough();

export const registrationResponseSchema: z.ZodType<RegistrationResponseJSON> = z.object({
  id: base64Url,
  rawId: base64Url,
  response: z.object({
    clientDataJSON: base64Url,
    attestationObject: base64Url,
    authenticatorData: base64Url.optional(),
    transports: z.array(authenticatorTransport).optional(),
    publicKeyAlgorithm: z.number().int().optional(),
    publicKey: base64Url.optional(),
  }),
  authenticatorAttachment: authenticatorAttachment.optional(),
  clientExtensionResults,
  type: z.literal('public-key'),
});

export const authenticationResponseSchema: z.ZodType<AuthenticationResponseJSON> = z.object({
  id: base64Url,
  rawId: base64Url,
  response: z.object({
    clientDataJSON: base64Url,
    authenticatorData: base64Url,
    signature: base64Url,
    userHandle: base64Url.optional(),
  }),
  authenticatorAttachment: authenticatorAttachment.optional(),
  clientExtensionResults,
  type: z.literal('public-key'),
});

export const registrationRequestSchema = z.object({
  ceremony: z.string().min(1).optional(),
  name: z.string().optional(),
  response: registrationResponseSchema,
});

export const memberRegistrationRequestSchema = registrationRequestSchema.extend({
  ceremony: z.string().min(1),
});

export const authenticationRequestSchema = z.object({
  ceremony: z.string().min(1).optional(),
  response: authenticationResponseSchema,
});

export const memberAuthenticationRequestSchema = authenticationRequestSchema.extend({
  ceremony: z.string().min(1),
});

export const passkeyIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const ceremonyPurposeSchema = z.enum([
  'member-authentication',
  'member-registration',
  'staff-authentication',
  'staff-registration',
]);

export const ceremonySchema = z
  .object({
    id: z.string().min(1),
    challenge: z.string().min(1),
    purpose: ceremonyPurposeSchema,
    subjectId: z.string().min(1).nullable(),
    issued: z.number().int().safe(),
    expires: z.number().int().safe(),
  })
  .refine((ceremony) => ceremony.expires > ceremony.issued);

export const transportsSchema: z.ZodType<AuthenticatorTransportFuture[]> =
  z.array(authenticatorTransport);

export type Ceremony = z.infer<typeof ceremonySchema>;
export type CeremonyPurpose = z.infer<typeof ceremonyPurposeSchema>;
export type RegistrationRequest = z.infer<typeof registrationRequestSchema>;
export type AuthenticationRequest = z.infer<typeof authenticationRequestSchema>;
